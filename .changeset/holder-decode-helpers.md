---
'@credebl/ssi-mobile-openid4vc': minor
---

Add holder-side credential decode helpers.

`decodeSdJwt(agent, jwt)` and `decodeMdocCredential(base64Url)` parse a compact SD-JWT VC and a base64url issuer-signed
mdoc respectively, without storing or verifying them. `OpenID4VCSDK.decodeSdJwt({ jwt })` and
`OpenID4VCSDK.decodeMdocCredential({ base64Url })` provide the same helpers for apps that use the SDK instance.
Empty input and malformed mdocs throw the exported `CredentialDecodeError`.
