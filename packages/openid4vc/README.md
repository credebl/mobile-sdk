# @credebl/ssi-mobile-openid4vc

OpenID4VC module of the CREDEBL Mobile SDK: receive credentials over OID4VCI, present them over OID4VP and the
Digital Credentials API, and display SD-JWT VC, mdoc and W3C credentials.

```bash
npm install @credebl/ssi-mobile-core @credebl/ssi-mobile-openid4vc
```

This package requires React Native >= 0.76 and the core SDK setup in the [root README](../../README.md). It is built
against Credo 0.7.4, so make sure your app resolves a single matching Credo version. Expo Go is not supported.

Register the module when you initialize the core SDK:

```ts
import { OpenID4VCSDK } from '@credebl/ssi-mobile-openid4vc'

const openid4vc = new OpenID4VCSDK({
  notificationTimeoutMs: 5000, // default
  // trustedCertificates / getTrustedCertificatesForVerification (X.509)
})
// MobileSDK.initializeSDK({ ..., modules: { openid4vc } })
```

## Requesting only the credentials you want

An issuer can offer several credential configurations in one offer. By default `resolveOpenId4VciOffer` asks for the
scopes of **all** offered configurations. Pass `credentialConfigurationIdsToRequest` to limit the authorization
request to the credentials the wallet actually intends to receive:

```tsx
const { resolvedCredentialOffer, resolvedAuthorizationRequest } = await sdk.resolveOpenId4VciOffer({
  offer: { uri: offerUri },
  authorization: { clientId, redirectUri },
  credentialConfigurationIdsToRequest: ['pid-sd-jwt'],
})

// Use the same IDs when receiving the credentials
await sdk.receiveCredentialFromOpenId4VciOffer({ resolvedCredentialOffer, credentialConfigurationIdsToRequest: ['pid-sd-jwt'], ... })
```

`getScopesForCredentialConfigurationIds(offer, ids)` is also exported for direct use. Duplicate scopes are removed.
If an ID is not in the offer, `UnknownCredentialConfigurationIdError` is thrown instead of silently requesting the
wrong scope. When no IDs are passed, behaviour is unchanged.

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

The examples below use the module registered with the core SDK. `resolvedCredentialOffer` and `accessToken` come from
`resolveOpenId4VciOffer` and the token helpers; `credentials` comes from `receiveCredentialFromOpenId4VciOffer`.

```tsx
import { useMobileSDK } from '@credebl/ssi-mobile-core'
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
  // result: { credential, stored: true, notification } |
  //         { credential, stored: false, error, notification }
  // result.notification: { status: 'sent', event } | { status: 'skipped', reason } | { status: 'failed', event, reason }
}
```

`storeOpenIdCredentialsAndNotify` stores the credentials one at a time, then sends `credential_accepted` for each
stored credential and `credential_failure` for each one that could not be stored. After initialization, store and
notification failures are reported in the results instead of thrown: check `stored` and `error` on each result.
Calling it before initialization throws `Agent not initialized`.

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

Use `openid4vc.sendCredentialNotifications({ notifications: [{ credential, event }, ...] })` to send several in one call.

### Behaviour

- **On by default.** Pass `sendNotification: false` to `receiveCredentialFromOpenId4VciOffer` to turn notifications
  off for those credentials.
- **Returns results instead of throwing for issuer failures.** `sendCredentialNotification` returns one
  `CredentialNotificationResult`; `sendCredentialNotifications` returns one result per credential. These helpers still
  throw `Agent not initialized` if the SDK has not been initialized:
  - `{ status: 'sent', event }`
  - `{ status: 'skipped', reason }`: the credential has no notification context from
    `receiveCredentialFromOpenId4VciOffer`, the issuer has no `notification_endpoint`, the credential has no
    `notification_id`, notifications are turned off, or the access token has expired.
  - `{ status: 'failed', event, reason }`: the issuer rejected the notification or did not answer in time. The
    reason includes the issuer's HTTP status and error code, e.g. `HTTP 400 invalid_notification_id`.
- **One at a time.** Notifications are sent in order, never in parallel, so the issuer does not update one issuance
  session concurrently.
- **Timeout.** Each notification waits at most `notificationTimeoutMs` (default 5000 ms, set in the
  `OpenID4VCSDK` configuration). After a timeout the remaining notifications of that call are skipped, because the
  timed-out request may still reach the issuer.
- **Holder DID check.** When `holderDidUrl` is used with the default `bindingPolicy: 'require'` (or any policy other
  than `prefer`) and the issued W3C credentials do not name the holder DID, `credential_failure` is sent for each
  credential before `HolderBindingMismatchError` is thrown.

### Access token lifetime

Notifications are authorised with the issuance access token. The SDK only knows an expiry when the token response
includes `expires_in`; many issuers use a short lifetime (for example 3600 seconds) and no refresh token, so send
notifications immediately after storing. A late notification may be rejected with HTTP 401 and cannot be retried in
the same issuance session.

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
credential failures into a `ReadableHolderError` with a message that can be shown to the wallet user.

```tsx
import { ReadableHolderError } from '@credebl/ssi-mobile-openid4vc'

try {
  await openid4vc.acquirePreAuthorizedAccessToken({ resolvedCredentialOffer, txCode })
} catch (error) {
  if (error instanceof ReadableHolderError) {
    // error.code        -> stable reason, e.g. 'TRANSACTION_CODE_REQUIRED'
    // error.status      -> stable numeric code (400, 404, 422, 502)
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
`mso_mdoc` credential. Unknown errors and non-`Error` values are rethrown unchanged by `readableHolderError` and
`withReadableErrors`. `receiveCredentialFromOpenId4VciOffer` also maps recognised biometric cancellations to
`BiometricAuthenticationCancelledError` or `BiometricAuthenticationNotEnabledError`.

Use `readableHolderError(error)` to map an error received from elsewhere, or `withReadableErrors(async () => ...)` to
wrap any async holder call. Both are exported from the package root.

## Decoding credentials

Inspect a raw encoded credential before deciding whether to store it. Both helpers only parse the credential: they
do **not** verify the signature, issuer, holder binding, status or validity dates. `compactJwt` is a compact SD-JWT VC
string, `base64Url` is an `MdocRecord.credentialInstances[].issuerSignedBase64Url` value, and `showError` is your UI
error handler.

```tsx
import { CredentialDecodeError } from '@credebl/ssi-mobile-openid4vc'

// Compact SD-JWT VC — needs an initialized Credo agent
const sdJwt = openid4vc.decodeSdJwt({ jwt: compactJwt })
// or, when you already have the agent: decodeSdJwt(agent, compactJwt)

// Base64url issuer-signed mdoc — no agent needed
const mdoc = openid4vc.decodeMdocCredential({ base64Url })
// mdoc = { namespace, docType, validityInfo, issuerSignedCertificateChain }

try {
  openid4vc.decodeMdocCredential({ base64Url: '' })
} catch (error) {
  if (error instanceof CredentialDecodeError) showError(error.message)
}
```

`decodeSdJwt` returns Credo's `SdJwtVc` with the parsed header, payload and disclosures. `decodeMdocCredential` returns
the mdoc namespaces, doc type, validity dates and issuer certificate chain. Empty input and malformed mdocs throw
`CredentialDecodeError`; the underlying parser error is kept in the message for diagnostics. The standalone
`decodeSdJwt(agent, jwt)` and `decodeMdocCredential(base64Url)` helpers are also exported from the package root; only
the SD-JWT helper needs an initialized agent.

## Credential status (revocation and suspension)

Check an SD-JWT VC against its status list on demand — for example when showing a stored credential to a user.

```tsx
// From a stored SdJwtVcRecord, or directly from a compact SD-JWT VC string
const result = await openid4vc.verifyCredentialStatus({ credential: record })
// { checked: true, status: 'revoked', verified: true, statusListUri, statusListIndex }

const results = await openid4vc.verifyCredentialStatuses({ credentials: records })
```

The standalone `verifyCredentialStatus(agent, { credential })` and `verifyCredentialStatuses(agent, { credentials })`
helpers are also exported from the package root when you already have an initialized agent. `record`/`records` are
`SdJwtVcRecord` instances or compact SD-JWT VC strings.

`status` is one of `valid`, `revoked`, `suspended` or `unknown`. With no status reference the result is
`{ checked: false, status: 'unknown', verified: true }`. A malformed credential is
`{ checked: false, status: 'unknown', verified: false, error }`. A status list fetch or parse failure is
`{ checked: true, status: 'unknown', verified: false, error }`, so a failed check is never treated as valid. Batch
checks run sequentially so a wallet does not fetch many status lists from one issuer at once.

The helper uses the agent's configured `fetch`, so it works in React Native without platform-specific networking
code. It reads the status bit only — it does **not** re-verify the credential signature, the status list token
signature, holder binding or validity dates. Use the agent's credential verification APIs for those checks.

Only SD-JWT VC `status_list` references are supported by this helper. W3C credentials and mdocs passed to it return
`checked: false`; use the appropriate credential verification APIs for those formats.
