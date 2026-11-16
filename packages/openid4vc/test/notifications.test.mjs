import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createNotificationContexts,
  sendCredentialNotifications,
  storeCredentialsAndNotify,
} from '../build/notifications.mjs'

const NOTIFICATION_ENDPOINT = 'https://issuer.example.com/notification'

function issuerMetadata({ notificationEndpoint = NOTIFICATION_ENDPOINT } = {}) {
  return {
    credentialIssuer: {
      credential_issuer: 'https://issuer.example.com',
      ...(notificationEndpoint ? { notification_endpoint: notificationEndpoint } : {}),
    },
  }
}

function context(overrides = {}) {
  return {
    enabled: true,
    metadata: issuerMetadata(),
    notificationId: 'notification-1',
    accessToken: 'access-token',
    credentialConfigurationId: 'identity',
    ...overrides,
  }
}

/** A holder that records each notification and answers with `answer(call)`. */
function createHolder(answer = async () => {}) {
  const calls = []
  return {
    calls,
    sendNotification: async (options) => {
      calls.push(options)
      return await answer(options)
    },
  }
}

/** The error Credo's holder throws when the issuer rejects a notification. */
function issuerError(status, error) {
  return Object.assign(new Error("Error sending notification to 'https://issuer.example.com'"), {
    response: {
      response: { status },
      notificationErrorResponseResult: { success: true, data: { error } },
    },
  })
}

const silentLogger = { warn: () => {} }

test('sends credential_accepted with the access token, dpop and notification id', async () => {
  const holder = createHolder()
  const dpop = { alg: 'ES256', nonce: 'nonce-1' }

  const results = await sendCredentialNotifications({
    holder,
    notifications: [{ context: context({ dpop }), event: 'credential_accepted' }],
  })

  assert.deepEqual(results, [{ status: 'sent', event: 'credential_accepted' }])
  assert.equal(holder.calls.length, 1)
  assert.deepEqual(holder.calls[0], {
    metadata: issuerMetadata(),
    accessToken: 'access-token',
    dpop,
    notificationId: 'notification-1',
    notificationEvent: 'credential_accepted',
  })
})

test('sends credential_failure and credential_deleted', async () => {
  const holder = createHolder()

  const results = await sendCredentialNotifications({
    holder,
    notifications: [
      { context: context({ notificationId: 'a' }), event: 'credential_failure' },
      { context: context({ notificationId: 'b' }), event: 'credential_deleted' },
    ],
  })

  assert.deepEqual(results, [
    { status: 'sent', event: 'credential_failure' },
    { status: 'sent', event: 'credential_deleted' },
  ])
  assert.deepEqual(
    holder.calls.map((call) => [call.notificationId, call.notificationEvent]),
    [
      ['a', 'credential_failure'],
      ['b', 'credential_deleted'],
    ]
  )
})

test('skips without a notification_endpoint, a notification_id, a context, or when turned off', async () => {
  const holder = createHolder()

  const results = await sendCredentialNotifications({
    holder,
    notifications: [
      { context: context({ metadata: issuerMetadata({ notificationEndpoint: null }) }), event: 'credential_accepted' },
      { context: context({ notificationId: undefined }), event: 'credential_accepted' },
      { context: context({ enabled: false }), event: 'credential_accepted' },
      { context: undefined, event: 'credential_accepted' },
    ],
  })

  assert.deepEqual(
    results.map((result) => result.status),
    ['skipped', 'skipped', 'skipped', 'skipped']
  )
  assert.match(results[0].reason, /notification_endpoint/)
  assert.match(results[1].reason, /notification_id/)
  assert.match(results[2].reason, /sendNotification is false/)
  assert.match(results[3].reason, /no notification context/)
  assert.equal(holder.calls.length, 0)
})

test('skips once the access token has expired', async () => {
  const holder = createHolder()
  const [expiring] = createNotificationContexts({
    enabled: true,
    metadata: issuerMetadata(),
    tokenResponse: { accessToken: 'access-token', accessTokenResponse: { expires_in: 3600 } },
    credentials: [{ notificationId: 'notification-1' }],
    now: () => 0,
  })
  assert.equal(expiring.accessTokenExpiresAt, 3_600_000)

  const before = await sendCredentialNotifications({
    holder,
    now: () => 3_599_999,
    notifications: [{ context: expiring, event: 'credential_deleted' }],
  })
  const after = await sendCredentialNotifications({
    holder,
    now: () => 3_600_000,
    notifications: [{ context: expiring, event: 'credential_deleted' }],
  })

  assert.deepEqual(before, [{ status: 'sent', event: 'credential_deleted' }])
  assert.equal(after[0].status, 'skipped')
  assert.match(after[0].reason, /access token .* expired/)
  assert.equal(holder.calls.length, 1)
})

test('reports an issuer error with its HTTP status and error code, without throwing', async () => {
  const warnings = []
  const holder = createHolder(async () => {
    throw issuerError(400, 'invalid_notification_id')
  })

  const results = await sendCredentialNotifications({
    holder,
    logger: { warn: (message) => warnings.push(message) },
    notifications: [
      { context: context({ notificationId: 'a' }), event: 'credential_accepted' },
      { context: context({ notificationId: 'b' }), event: 'credential_accepted' },
    ],
  })

  assert.equal(results.length, 2)
  for (const result of results) {
    assert.equal(result.status, 'failed')
    assert.equal(result.event, 'credential_accepted')
    assert.match(result.reason, /HTTP 400 invalid_notification_id$/)
  }
  // An issuer error does not stop the remaining notifications
  assert.equal(holder.calls.length, 2)
  assert.equal(warnings.length, 2)
  assert.doesNotMatch(warnings[0], /access-token/)
})

test('a failure reason falls back to the error message without an issuer response', async () => {
  const errors = { a: new Error('offline'), b: 'boom', c: issuerError(401) }
  const holder = createHolder(async ({ notificationId }) => {
    throw errors[notificationId]
  })

  const results = await sendCredentialNotifications({
    holder,
    logger: silentLogger,
    notifications: ['a', 'b', 'c'].map((notificationId) => ({
      context: context({ notificationId }),
      event: 'credential_accepted',
    })),
  })

  assert.deepEqual(
    results.map((result) => result.reason),
    ['offline', 'boom', `${errors.c.message}: HTTP 401`]
  )
})

test('skips the remaining notifications after a timeout', async () => {
  const holder = createHolder((options) => (options.notificationId === 'a' ? new Promise(() => {}) : Promise.resolve()))

  const results = await sendCredentialNotifications({
    holder,
    logger: silentLogger,
    timeoutMs: 20,
    notifications: [
      { context: context({ notificationId: 'a' }), event: 'credential_accepted' },
      { context: context({ notificationId: 'b' }), event: 'credential_accepted' },
      { context: context({ notificationId: 'c' }), event: 'credential_failure' },
    ],
  })

  assert.equal(results[0].status, 'failed')
  assert.match(results[0].reason, /No answer from the issuer within 20 ms/)
  assert.deepEqual(results.slice(1), [
    { status: 'skipped', reason: 'An earlier notification to this issuer timed out' },
    { status: 'skipped', reason: 'An earlier notification to this issuer timed out' },
  ])
  assert.equal(holder.calls.length, 1)
})

test('sends notifications one at a time, in order', async () => {
  let inFlight = 0
  let maxInFlight = 0
  const holder = createHolder(async () => {
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 5))
    inFlight--
  })

  await sendCredentialNotifications({
    holder,
    notifications: ['a', 'b', 'c'].map((notificationId) => ({
      context: context({ notificationId }),
      event: 'credential_accepted',
    })),
  })

  assert.equal(maxInFlight, 1)
  assert.deepEqual(
    holder.calls.map((call) => call.notificationId),
    ['a', 'b', 'c']
  )
})

test('createNotificationContexts prefers the dpop of the credential response', () => {
  const tokenDpop = { alg: 'ES256', nonce: 'token-nonce' }
  const credentialDpop = { alg: 'ES256', nonce: 'credential-nonce' }
  const tokenResponse = { accessToken: 'access-token', dpop: tokenDpop, accessTokenResponse: {} }

  const [withCredentialDpop] = createNotificationContexts({
    enabled: false,
    metadata: issuerMetadata(),
    tokenResponse,
    dpop: credentialDpop,
    credentials: [{ notificationId: 'a', credentialConfigurationId: 'identity' }],
  })
  const [withTokenDpop] = createNotificationContexts({
    enabled: true,
    metadata: issuerMetadata(),
    tokenResponse,
    credentials: [{}],
  })

  assert.deepEqual(withCredentialDpop, {
    enabled: false,
    metadata: issuerMetadata(),
    notificationId: 'a',
    accessToken: 'access-token',
    dpop: credentialDpop,
    accessTokenExpiresAt: undefined,
    credentialConfigurationId: 'identity',
  })
  assert.equal(withTokenDpop.dpop, tokenDpop)
  assert.equal(withTokenDpop.notificationId, undefined)
})

test('storeCredentialsAndNotify sends accepted for stored and failure for unstored credentials', async () => {
  const holder = createHolder()
  const storeError = new Error('storage full')
  const stored = []
  const credentials = ['a', 'b', 'c'].map((notificationId) => ({
    id: notificationId,
    notification: context({ notificationId }),
  }))

  const results = await storeCredentialsAndNotify({
    holder,
    credentials,
    store: async (credential) => {
      if (credential.id === 'b') throw storeError
      stored.push(credential.id)
    },
  })

  assert.deepEqual(stored, ['a', 'c'])
  assert.deepEqual(results, [
    { credential: credentials[0], stored: true, notification: { status: 'sent', event: 'credential_accepted' } },
    {
      credential: credentials[1],
      stored: false,
      error: storeError,
      notification: { status: 'sent', event: 'credential_failure' },
    },
    { credential: credentials[2], stored: true, notification: { status: 'sent', event: 'credential_accepted' } },
  ])
  assert.deepEqual(
    holder.calls.map((call) => [call.notificationId, call.notificationEvent]),
    [
      ['a', 'credential_accepted'],
      ['b', 'credential_failure'],
      ['c', 'credential_accepted'],
    ]
  )
})

test('storeCredentialsAndNotify keeps the stored credential when the notification fails', async () => {
  const holder = createHolder(async () => {
    throw issuerError(500, 'server_error')
  })
  const credential = { notification: context() }

  const [result] = await storeCredentialsAndNotify({
    holder,
    logger: silentLogger,
    credentials: [credential],
    store: async () => {},
  })

  assert.equal(result.stored, true)
  assert.equal(result.notification.status, 'failed')
  assert.match(result.notification.reason, /HTTP 500 server_error/)
})
