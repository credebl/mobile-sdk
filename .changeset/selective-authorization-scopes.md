---
'@credebl/ssi-mobile-openid4vc': minor
---

Add credential-aware OID4VCI authorization scopes.

`resolveOpenId4VciOffer` now accepts an optional `credentialConfigurationIdsToRequest` list. When supplied, the
authorization request carries only the scopes of the selected credential configurations instead of every configuration
the issuer offered. The exported `getScopesForCredentialConfigurationIds` helper implements the filtering and throws
`UnknownCredentialConfigurationIdError` for IDs that are not offered. Omitting the list preserves existing behaviour.
