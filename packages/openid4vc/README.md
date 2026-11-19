# @credebl/ssi-mobile-openid4vc

OpenID4VC module of the CREDEBL Mobile SDK: receive credentials over OID4VCI, present them over OID4VP and the
Digital Credentials API, and display SD-JWT VC, mdoc and W3C credentials.

```bash
npm install @credebl/ssi-mobile-openid4vc
```

## OID4VCI notifications

After the wallet receives credentials over OID4VCI, it tells the issuer what happened to each one by sending a
notification to the issuer's `notification_endpoint`
([OpenID4VCI 1.0 §11](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-notification-endpoint)):

| Event                 | When to send it                              |
| --------------------- | -------------------------------------------- |
| `credential_accepted` | The credential was stored in the wallet.     |
| `credential_failure`  | The credential could not be stored.          |
| `credential_deleted`  | The user deleted or declined the credential. |

`receiveCredentialFromOpenId4VciOffer` returns the credentials without storing them, and keeps a `notification`
context on each one: its `notification_id`, the access token of the issuance and the DPoP options. Pass that
credential back to the SDK after the app stores it, fails to store it, or deletes it.

The examples use the module registered with the core SDK:

```tsx
import { OpenID4VCSDK } from '@credebl/ssi-mobile-openid4vc'

type AppModules = { openid4vc: OpenID4VCSDK }

const { sdk } = useMobileSDK<AppModules>()
const openid4vc = sdk.modules.openid4vc
```

### Store and notify in one call

```ts
const { credentials } = await openid4vc.receiveCredentialFromOpenId4VciOffer({
  resolvedCredentialOffer,
  accessToken,
})

const results = await openid4vc.storeOpenIdCredentialsAndNotify({ credentials })

for (const result of results) {
  if (!result.stored) console.warn('Could not store credential', result.error)
  // result.notification: { status: 'sent', event } | { status: 'skipped', reason } | { status: 'failed', event, reason }
}
```

`storeOpenIdCredentialsAndNotify` stores the credentials one at a time, then sends `credential_accepted` for each
stored credential and `credential_failure` for each one that could not be stored. It does not throw: check `stored`
on each result.

### Notify after storing yourself

```ts
for (const credential of credentials) {
  try {
    await openid4vc.storeOpenIdCredential(credential.credential)
    await openid4vc.sendCredentialNotification({ credential, event: 'credential_accepted' })
  } catch (error) {
    await openid4vc.sendCredentialNotification({ credential, event: 'credential_failure' })
  }
}

// Later, when the user deletes the credential (while the access token is still valid):
await openid4vc.sendCredentialNotification({ credential, event: 'credential_deleted' })
```

Use `sendCredentialNotifications({ notifications: [{ credential, event }, ...] })` to send several in one call.

### Behaviour

- **On by default.** Pass `sendNotification: false` to `receiveCredentialFromOpenId4VciOffer` to turn notifications
  off for those credentials.
- **Never throws.** Each call returns a `CredentialNotificationResult`:
  - `{ status: 'sent', event }`
  - `{ status: 'skipped', reason }`: the issuer has no `notification_endpoint`, the credential has no
    `notification_id`, notifications are turned off, or the access token has expired.
  - `{ status: 'failed', event, reason }`: the issuer rejected the notification or did not answer in time. The
    reason includes the issuer's HTTP status and error code, e.g. `HTTP 400 invalid_notification_id`.
- **One at a time.** Notifications are sent in order, never in parallel, so the issuer does not update one issuance
  session concurrently.
- **Timeout.** Each notification waits at most `notificationTimeoutMs` (default 5000 ms, set in the
  `OpenID4VCSDK` configuration). After a timeout the remaining notifications of that call are skipped, because the
  timed-out request may still reach the issuer.
- **Holder DID check.** When `holderDidUrl` is used with `bindingPolicy: 'require'` and the issued W3C credentials
  do not name the holder DID, `credential_failure` is sent for each credential before the error is thrown.

### Access token lifetime

Notifications are authorised with the access token of the issuance. Platform issuers issue tokens valid for
3600 seconds by default, without a refresh token, so send notifications right after storing. The issuance session
cannot be refreshed once it is completed, so a late notification cannot be retried successfully.

- When the token response includes `expires_in`, the SDK checks the expiry locally and returns `skipped` with a reason
  naming the event, for example `The access token of the issuance has expired before 'credential_deleted' could be
  sent to the issuer`. No request is made to the issuer in that case.
- When the issuer omits `expires_in`, no local expiry time is known and the request is attempted. If the issuer answers
  with `HTTP 401`, the result is `failed` with an explanation that the notification cannot be retried.
- A `credential_deleted` event only reaches the issuer while the token is still valid. Do not persist a `notification`
  context hoping to report a deletion days later: it holds the access token, so keep it in memory only and never log
  it.

Credo 0.7.4 does not send `event_description`, so it is not supported. Deferred credentials do not get notifications
yet.

## Readable holder errors

The OID4VCI entry points (`resolveOpenId4VciOffer`, `acquirePreAuthorizedAccessToken`,
`acquireAuthorizationCodeAccessToken` and `receiveCredentialFromOpenId4VciOffer`) translate known issuer and
Credential failures into a `ReadableHolderError` with a message that can be shown to the wallet user.

```tsx
import { ReadableHolderError } from '@credebl/ssi-mobile-openid4vc'

try {
  await openid4vc.acquirePreAuthorizedAccessToken({ resolvedCredentialOffer, txCode })
} catch (error) {
  if (error instanceof ReadableHolderError) {
    // error.code        -> stable reason, e.g. 'TRANSACTION_CODE_REQUIRED'
    // error.status      -> mirrors the platform error taxonomy (400, 404, 422, 502)
    // error.message     -> user-facing text, with the original text in brackets
    // error.originalMessage -> the raw Credo/issuer text, for diagnostics
    showError(error.message)
    return
  }
  throw error
}
```

The mapped reasons are: a missing transaction code, an offer that was used/expired/withdrawn, unreadable issuer
metadata, an untrusted X.509 root, mdoc validity/signing-date/country problems, and DID binding requested for an
`mso_mdoc` credential. Unknown errors, biometric cancellations and non-`Error` values are rethrown unchanged.

Use `readableHolderError(error)` to map an error received from elsewhere, or `withReadableErrors(() => ...)` to wrap
any holder call. Both are exported from the package root.

## Decoding credentials

Inspect a raw encoded credential before deciding whether to store it. Both helpers only parse the credential: they
do **not** verify the signature, issuer, holder binding, status or validity dates.

```tsx
import { CredentialDecodeError, decodeMdocCredential, decodeSdJwt } from '@credebl/ssi-mobile-openid4vc'

// Compact SD-JWT VC — needs an initialized Credo agent
const sdJwt = sdk.decodeSdJwt({ jwt: compactJwt })
// or, when you already have the agent: decodeSdJwt(agent, compactJwt)

// Base64url issuer-signed mdoc — no agent needed
const mdoc = sdk.decodeMdocCredential({ base64Url })
// mdoc = { namespace, docType, validityInfo, issuerSignedCertificateChain }

try {
  sdk.decodeMdocCredential({ base64Url: '' })
} catch (error) {
  if (error instanceof CredentialDecodeError) showError(error.message)
}
```

`decodeSdJwt` returns Credo's `SdJwtVc` with the parsed header, payload and disclosures. `decodeMdocCredential` returns
the mdoc namespaces, doc type, validity dates and issuer certificate chain — the same fields the platform holder
service exposes. Empty input and malformed mdocs throw `CredentialDecodeError`; the underlying parser error is kept
in the message for diagnostics.

## Credential status (revocation and suspension)

Check an SD-JWT VC against its status list on demand — for example when showing a stored credential to a user.

```tsx
import { verifyCredentialStatus, verifyCredentialStatuses } from '@credebl/ssi-mobile-openid4vc'

// From a stored SdJwtVcRecord, or directly from a compact SD-JWT VC string
const result = await sdk.verifyCredentialStatus({ credential: record })
// { checked: true, status: 'revoked', verified: true, statusListUri, statusListIndex }

const results = await sdk.verifyCredentialStatuses({ credentials: records })
```

`status` is one of `valid`, `revoked`, `suspended` or `unknown`. The result is fail-closed: if the status list cannot
be fetched or decoded, `verified` is `false` and `error` explains why. Credentials with no status reference return
`checked: false`. Batch checks run sequentially so a wallet does not fetch many status lists from one issuer at once.

The helper uses the agent's configured `fetch`, so it works in React Native without platform-specific networking
code. It reads the status bit only — it does **not** re-verify the credential signature, the status list token
signature, holder binding or validity dates. Use the agent's credential verification APIs for those checks.

Only SD-JWT VC status lists are supported. Credo 0.7.4 does not verify W3C credential status lists or mdoc status, so
those credential formats return `checked: false`.
