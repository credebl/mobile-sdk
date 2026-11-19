---
'@credebl/ssi-mobile-openid4vc': patch
---

Improve OID4VCI notification diagnostics for post-expiry failures.

A notification skipped because the issuance access token expired now names the event that was dropped. An issuer
`HTTP 401` response now explains that the token is no longer accepted and that the notification cannot be retried,
instead of surfacing a bare status. Documentation covers the case where the issuer omits `expires_in`.
