---
'@credebl/ssi-mobile-core': minor
'@credebl/ssi-mobile-didcomm': minor
'@credebl/ssi-mobile-openid4vc': minor
---

Align the mobile SDK with CREDEBL Platform v2.3.0 and agent-controller v2.3.2.

- Upgrade the Credo stack from 0.7.0 to 0.7.4 and `@owf/mdoc` from 0.6 to 0.8.3.
- Add wallet-side `ldp_vc` support for OID4VCI issuance, DCQL selection, and OID4VP presentation.
- Use the stored W3C credential claim format (`JwtVc` or `LdpVc`) when selecting credentials for DCQL.
- Show `ldp_vc` placeholders for unsatisfied DCQL queries.
- Bind credentials to an existing holder DID with `holderDidUrl` and `bindingPolicy` on `receiveCredentialFromOpenId4VciOffer`, including issuer capability checks and W3C subject verification.
- Carry the Credo 0.7.4 patches used by agent-controller 2.3.2 for `ldp_vc` record lookup, signature-suite selection, JWA proof algorithms, optional W3C `id`/`expirationDate`, JSON-LD signing, and DIDComm forward messages.
- Adapt mdoc disclosure limiting to the `@owf/mdoc` 0.8 API.
