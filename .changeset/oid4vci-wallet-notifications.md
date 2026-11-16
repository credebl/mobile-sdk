---
'@credebl/ssi-mobile-openid4vc': minor
---

Send OID4VCI wallet notifications (OpenID4VCI 1.0 §11) to the issuer's `notification_endpoint`.

- `receiveCredentialFromOpenId4VciOffer` keeps a `notification` context (notification id, access token, DPoP) on each returned credential. Notifications are on by default; pass `sendNotification: false` to turn them off.
- New `sendCredentialNotification({ credential, event })` and `sendCredentialNotifications({ notifications })` send `credential_accepted`, `credential_failure` or `credential_deleted` after the app stores, fails to store, or deletes a credential.
- New `storeOpenIdCredentialsAndNotify({ credentials })` stores the received credentials and sends `credential_accepted` or `credential_failure` for each of them.
- Notifications go out one at a time with a timeout (`notificationTimeoutMs`, default 5000 ms). After a timeout, the rest of that batch is skipped. A notification that is not sent is returned as `skipped` or `failed` (with the issuer's HTTP status and error code) and never throws.
- When the `holderDidUrl` subject check fails, `credential_failure` is sent for each credential before the error is thrown.
