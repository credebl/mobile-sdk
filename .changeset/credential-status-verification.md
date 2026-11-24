---
'@credebl/ssi-mobile-openid4vc': minor
---

Add on-demand SD-JWT VC credential status verification.

`verifyCredentialStatus(agent, { credential })` reads a credential's status list and reports `valid`, `revoked` or
`suspended`, with a fail-closed result when the list cannot be fetched or decoded. `verifyCredentialStatuses` checks
several credentials sequentially in input order. Both are available as `OpenID4VCSDK.verifyCredentialStatus` and
`OpenID4VCSDK.verifyCredentialStatuses`, accept a stored `SdJwtVcRecord` or a compact SD-JWT VC, and use the agent's
configured `fetch`. The `@owf/token-status-list` decoder Credo already depends on is now a direct dependency.
