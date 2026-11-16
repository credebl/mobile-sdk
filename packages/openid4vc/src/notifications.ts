import type {
  OpenId4VciDpopRequestOptions,
  OpenId4VciNotificationEvent,
  OpenId4VciRequestTokenResponse,
  OpenId4VciResolvedCredentialOffer,
  OpenId4VciSendNotificationOptions,
} from '@credo-ts/openid4vc'

/**
 * OpenID4VCI 1.0 §11 notification events:
 * - `credential_accepted`: the credential was stored in the wallet.
 * - `credential_failure`: the credential could not be stored.
 * - `credential_deleted`: the user deleted (or declined) the credential.
 */
export type CredentialNotificationEvent = Extract<
  OpenId4VciNotificationEvent,
  'credential_accepted' | 'credential_failure' | 'credential_deleted'
>

/**
 * Outcome of the OID4VCI notification for one received credential. A notification that is not
 * sent is reported here and never throws.
 */
export type CredentialNotificationResult =
  | { status: 'sent'; event: CredentialNotificationEvent }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; event: CredentialNotificationEvent; reason: string }

/**
 * What the wallet needs to notify the issuer about one received credential. Returned as
 * `notification` on each credential from `receiveCredentialFromOpenId4VciOffer`.
 *
 * It holds the access token of the issuance, so keep it in memory only: do not persist or log it.
 * The token expires (CREDEBL issuers default to 3600 seconds, without a refresh token), so a
 * notification sent after `accessTokenExpiresAt` is skipped.
 */
export interface OpenId4VciNotificationContext {
  /** `false` when notifications were turned off with `sendNotification: false`. */
  enabled: boolean
  metadata: OpenId4VciResolvedCredentialOffer['metadata']
  notificationId?: string
  accessToken: string
  dpop?: OpenId4VciDpopRequestOptions
  /** Epoch milliseconds after which the access token is expired, when the issuer said so with `expires_in`. */
  accessTokenExpiresAt?: number
  credentialConfigurationId?: string
}

export interface NotificationHolder {
  sendNotification(options: OpenId4VciSendNotificationOptions): Promise<void>
}

export interface NotificationLogger {
  warn(message: string, data?: Record<string, unknown>): void
}

export interface SendCredentialNotificationsOptions {
  holder: NotificationHolder
  logger?: NotificationLogger
  /** How long to wait for the issuer to answer one notification. */
  timeoutMs?: number
  /** Returns the current time in epoch milliseconds, for the access token expiry check. */
  now?: () => number
  notifications: Array<{ context?: OpenId4VciNotificationContext; event: CredentialNotificationEvent }>
}

export const DEFAULT_NOTIFICATION_TIMEOUT_MS = 5000

class NotificationTimeoutError extends Error {}

/**
 * Builds the notification context for each credential of one credential request.
 */
export function createNotificationContexts({
  enabled,
  metadata,
  tokenResponse,
  dpop,
  credentials,
  now = Date.now,
}: {
  enabled: boolean
  metadata: OpenId4VciResolvedCredentialOffer['metadata']
  tokenResponse: OpenId4VciRequestTokenResponse
  /** DPoP options returned by the credential request, which carry the latest DPoP nonce. */
  dpop?: OpenId4VciDpopRequestOptions
  credentials: Array<{ notificationId?: string; credentialConfigurationId?: string }>
  now?: () => number
}): OpenId4VciNotificationContext[] {
  const expiresIn = tokenResponse.accessTokenResponse?.expires_in
  const accessTokenExpiresAt = typeof expiresIn === 'number' ? now() + expiresIn * 1000 : undefined

  return credentials.map(({ notificationId, credentialConfigurationId }) => ({
    enabled,
    metadata,
    notificationId,
    accessToken: tokenResponse.accessToken,
    dpop: dpop ?? tokenResponse.dpop,
    accessTokenExpiresAt,
    credentialConfigurationId,
  }))
}

/**
 * Sends an OID4VCI notification to the issuer for each credential, one at a time: an issuer may record
 * each notification on the issuance session, and parallel updates of one session can overwrite each other.
 * After a notification times out, the remaining ones are skipped. Never throws.
 */
export async function sendCredentialNotifications({
  holder,
  logger,
  timeoutMs = DEFAULT_NOTIFICATION_TIMEOUT_MS,
  now = Date.now,
  notifications,
}: SendCredentialNotificationsOptions): Promise<CredentialNotificationResult[]> {
  const results: CredentialNotificationResult[] = []
  let timedOut = false

  for (const { context, event } of notifications) {
    if (timedOut) {
      // A timed-out call cannot be cancelled and may still reach the issuer, so a further call could
      // update the issuance session at the same time
      results.push({ status: 'skipped', reason: 'An earlier notification to this issuer timed out' })
      continue
    }

    const sent = await sendOne({ holder, logger, timeoutMs, now, context, event })
    results.push(sent.result)
    timedOut = sent.timedOut
  }

  return results
}

async function sendOne({
  holder,
  logger,
  timeoutMs,
  now,
  context,
  event,
}: {
  holder: NotificationHolder
  logger?: NotificationLogger
  timeoutMs: number
  now: () => number
  context?: OpenId4VciNotificationContext
  event: CredentialNotificationEvent
}): Promise<{ result: CredentialNotificationResult; timedOut: boolean }> {
  const skipped = (reason: string) => ({ result: { status: 'skipped', reason } as const, timedOut: false })
  if (!context) return skipped('The credential has no notification context from receiveCredentialFromOpenId4VciOffer')
  if (!context.enabled) return skipped('sendNotification is false')
  if (!context.metadata.credentialIssuer.notification_endpoint) {
    return skipped('Issuer metadata has no notification_endpoint')
  }
  if (!context.notificationId) return skipped('Credential response has no notification_id')
  if (context.accessTokenExpiresAt !== undefined && now() >= context.accessTokenExpiresAt) {
    return skipped('The access token of the issuance has expired')
  }

  try {
    await withTimeout(
      holder.sendNotification({
        metadata: context.metadata,
        accessToken: context.accessToken,
        dpop: context.dpop,
        notificationId: context.notificationId,
        notificationEvent: event,
      }),
      timeoutMs,
      `No answer from the issuer within ${timeoutMs} ms`
    )
    return { result: { status: 'sent', event }, timedOut: false }
  } catch (error) {
    const reason = notificationErrorReason(error)
    logger?.warn(
      `[OpenId4VCI] Failed to send '${event}' notification to the issuer for '${context.credentialConfigurationId}': ${reason}`,
      { notificationId: context.notificationId, credentialIssuer: context.metadata.credentialIssuer.credential_issuer }
    )
    return { result: { status: 'failed', event, reason }, timedOut: error instanceof NotificationTimeoutError }
  }
}

/**
 * The error message, plus the issuer's HTTP status and OAuth error code when the issuer
 * rejected the notification (e.g. `HTTP 400 invalid_notification_id`).
 */
function notificationErrorReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const { response } = (error ?? {}) as {
    response?: {
      response?: { status?: number }
      notificationErrorResponseResult?: { success: boolean; data?: { error?: string } }
    }
  }
  const status = response?.response?.status
  const code = response?.notificationErrorResponseResult?.data?.error
  const detail = [status && `HTTP ${status}`, code].filter(Boolean).join(' ')
  return detail ? `${message}: ${detail}` : message
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new NotificationTimeoutError(message)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

export type StoreAndNotifyResult<Credential> =
  | { credential: Credential; stored: true; notification: CredentialNotificationResult }
  | { credential: Credential; stored: false; error: unknown; notification: CredentialNotificationResult }

/**
 * Stores each credential one at a time, then sends `credential_accepted` for each stored credential
 * and `credential_failure` for each one that could not be stored. Never throws: check `stored` on each result.
 */
export async function storeCredentialsAndNotify<Credential extends { notification?: OpenId4VciNotificationContext }>({
  credentials,
  store,
  ...options
}: Omit<SendCredentialNotificationsOptions, 'notifications'> & {
  credentials: Credential[]
  store: (credential: Credential) => Promise<unknown>
}): Promise<Array<StoreAndNotifyResult<Credential>>> {
  const stored: Array<{ ok: true } | { ok: false; error: unknown }> = []
  for (const credential of credentials) {
    try {
      await store(credential)
      stored.push({ ok: true })
    } catch (error) {
      stored.push({ ok: false, error })
    }
  }

  const notifications = await sendCredentialNotifications({
    ...options,
    notifications: credentials.map((credential, index) => ({
      context: credential.notification,
      event: stored[index].ok ? 'credential_accepted' : 'credential_failure',
    })),
  })

  return credentials.map((credential, index) => {
    const result = stored[index]
    return result.ok
      ? { credential, stored: true, notification: notifications[index] }
      : { credential, stored: false, error: result.error, notification: notifications[index] }
  })
}
