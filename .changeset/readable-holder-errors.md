---
'@credebl/ssi-mobile-openid4vc': minor
---

Add readable OID4VCI holder errors.

`resolveOpenId4VciOffer`, both access-token methods and `receiveCredentialFromOpenId4VciOffer` now translate known
issuer and Credo failures into a `ReadableHolderError` with a stable `code`, a platform-compatible `status`, a
user-facing message and the original technical text. `readableHolderError` and `withReadableErrors` are exported for
apps that need to map errors from their own holder calls. Unknown errors and biometric cancellations pass through
unchanged.
