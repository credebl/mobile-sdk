# CREDEBL Mobile SDK v2.3.0

Released alongside CREDEBL Platform v2.3.0 and aligned with agent-controller v2.3.3.
Previous stable release: v2.2.1.

## Release candidate

2.3.0 is published first as a release candidate, `2.3.0-rc.0`, under the npm `rc` dist-tag. It is tested
together with CREDEBL Platform `v2.3.0-rc.3` and agent-controller `v2.3.3-rc.1` before the final 2.3.0. The
`latest` dist-tag stays on 2.2.1 until then. To try the release candidate:

```bash
npm install @credebl/ssi-mobile-core@rc @credebl/ssi-mobile-didcomm@rc @credebl/ssi-mobile-openid4vc@rc
```

Further release candidates (`2.3.0-rc.1`, …) follow if fixes land. For the final release, maintainers run
`pnpm changeset pre exit` on `main`; the next version PR then releases 2.3.0 under `latest`.

## Compatibility

| Component | Version |
| --- | --- |
| `@credebl/ssi-mobile-core` | 2.3.0 |
| `@credebl/ssi-mobile-didcomm` | 2.3.0 |
| `@credebl/ssi-mobile-openid4vc` | 2.3.0 |
| `@credebl/digilocker-mobile` | 1.1.0 (unchanged) |
| Credo stack | 0.7.4 |
| `@owf/mdoc` | 0.8.3 |
| `@openwallet-foundation/askar-react-native` | 0.6.0 |
| `@hyperledger/anoncreds-react-native` | 0.4.0 |
| `@animo-id/expo-digital-credentials-api` | 0.4.x |
| CREDEBL Platform | 2.3.0 (release candidate: 2.3.0-rc.3) |
| agent-controller | 2.3.3 (release candidate: 2.3.3-rc.1; minimum 2.3.0) |
| React Native | >= 0.76 |

## Dependency updates

- `@credo-ts/*` 0.7.0 → 0.7.4 (`core`, `didcomm`, `askar`, `anoncreds`, `indy-vdr`, `openid4vc`, `question-answer`, `react-native`).
- `@credo-ts/didcomm-push-notifications` `0.0.2-alpha-20251223125919` → `0.0.4-alpha-20261026124349` for Credo 0.7 compatibility.
- `@owf/mdoc` `^0.6.0` → `^0.8.1` to match the version required by Credo 0.7.4.

## Wallet-side changes

- OID4VCI: accept `ldp_vc` credentials whose issuer lists JWA algorithms such as `EdDSA` or `ES256` in `proof_signing_alg_values_supported`. Older issuers that list signature-suite names remain supported.
- OID4VCI: allow plain JWK holder binding for `ldp_vc` and `jwt_vc_json` configuration formats.
- OID4VCI: bind credentials to an existing holder DID with `holderDidUrl` (a verification method id or a bare DID) and `bindingPolicy` (`require` by default, or `prefer` to fall back to a new key). The wallet validates the DID method and proof algorithms against the issuer before requesting, and with `require` verifies that W3C credentials name the holder DID as their subject.
- OID4VCI: send wallet notifications (OpenID4VCI 1.0 §11) to the issuer's `notification_endpoint`: `credential_accepted` after the app stores a credential, `credential_failure` when it cannot, and `credential_deleted` when the user deletes or declines one. This matches the holder behaviour of agent-controller 2.3.3, so issuers on CREDEBL Platform 2.3.0 hear back from mobile wallets as well. See [OID4VCI notifications](./packages/openid4vc/README.md#oid4vci-notifications).
- DCQL: use the stored W3C credential claim format (`JwtVc` or `LdpVc`) instead of always reporting `JwtVc`.
- DCQL: render `ldp_vc` placeholders for unsatisfied credential queries, including a display name from `meta.type_values`.
- DCQL and PEX: prefer the signature suite that accepts the holder verification method type, so an `Ed25519VerificationKey2020` key signs with `Ed25519Signature2020` rather than `Ed25519Signature2018`.
- JSON-LD: skip undefined properties during expansion and allow signing without fully defined contexts, matching agent-controller behavior for credentials issued by third parties.
- mdoc: adapt disclosure limiting and attribute mapping to the `@owf/mdoc` 0.8 API.
- DIDComm: include the original message type on forward messages for mediator compatibility.

## Patched dependencies

The release carries build-output patches from agent-controller v2.3.2 so that stock Credo 0.7.4 behaves the same in the wallet:

| Package | Patch |
| --- | --- |
| `@credo-ts/core` | `ldp_vc` DCQL record lookup, DCQL/PEX signature-suite selection, optional W3C `id`/`expirationDate` |
| `@credo-ts/openid4vc` | holder-side `ldp_vc` JWA proof algorithm handling |
| `@credo-ts/didcomm` | optional `messageType` on forward messages |
| `@digitalcredentials/jsonld` | skip undefined values during expansion |
| `@digitalcredentials/jsonld-signatures` | non-safe JSON-LD canonicalization for third-party contexts |

Patches live in `patches/` and are registered under `patchedDependencies` in `pnpm-workspace.yaml`. Re-validate them when upgrading Credo.

## Upgrade notes

- Update all `@credebl/ssi-mobile-*` packages together. The core, DIDComm, and OpenID4VC packages were released as a fixed minor version.
- Run `pnpm install` with the committed lockfile. `pnpm-lock.yaml` pins the patched Credo builds.
- Install `@openwallet-foundation/askar-react-native` 0.6.0 and `@hyperledger/anoncreds-react-native` 0.4.0 in the app. Newer bindings (askar 0.7, anoncreds 0.5) are outside the peer ranges of Credo 0.7.4 and are not supported in this release.
- Native mdoc handling now uses `@owf/mdoc` 0.8. Rebuild the iOS/Android app rather than reusing a Metro cache or an old native bundle.
- Verify the issuer supports `ldp_vc` over OID4VCI before requesting a JSON-LD credential. The wallet still requests proof of possession with the algorithms listed by the issuer.
- To bind a credential to an existing DID, pass `holderDidUrl` to `receiveCredentialFromOpenId4VciOffer`. It accepts a verification method id (for example `did:web:wallet.example.com#key-1`) or a bare DID, which uses the DID document's first authentication key. The DID must already be created or imported in the wallet. With the default `bindingPolicy: 'require'`, the request fails if the issuer does not support that DID method or key algorithm; use `bindingPolicy: 'prefer'` to fall back to a newly created key. For W3C credentials, `require` also verifies that the issued subject is the holder DID.

- To notify issuers, call `sendCredentialNotification({ credential, event })` after storing each credential returned by `receiveCredentialFromOpenId4VciOffer`, or use `storeOpenIdCredentialsAndNotify({ credentials })` to store and notify in one call. Do it right after storing: notifications use the issuance access token, which expires (3600 seconds by default on CREDEBL issuers, with no refresh token). Notifications are on by default; pass `sendNotification: false` to `receiveCredentialFromOpenId4VciOffer` to turn them off.

## Verification

- `pnpm install` completes with the committed lockfile.
- `pnpm types:check` passes on a clean tree.
- `pnpm build` succeeds for core, didcomm, openid4vc, and digilocker.
- `pnpm test` passes, including new coverage for `ldp_vc` placeholders, W3C claim-format selection, and OID4VCI notifications (accepted, failure, deleted, skipped, issuer errors, timeout, ordering).
- `pnpm style:check` passes (existing suppressions remain warnings only).

## Known issues and follow-ups

- `W3cV2CredentialRecord` is not yet handled by the DCQL selection helper.
- The `ldp_vc` presentation path depends on the verifier accepting JSON-LD credentials and on the credential contexts being resolvable. Use the X.509 trusted-issuer configuration where required.
- OID4VCI notifications cannot carry `event_description`, because Credo 0.7.4 does not send it. Notifications for deferred credentials are not sent yet.
- The patches modify Credo build output. If Credo changes its build layout, regenerate the patches instead of editing them by hand.
