# @credebl/ssi-mobile-openid4vc

## 2.3.0

### Minor Changes

- 6e3ae21: Add on-demand SD-JWT VC credential status verification.
  
  `verifyCredentialStatus(agent, { credential })` reads a credential's status list and reports `valid`, `revoked` or
  `suspended`, with a fail-closed result when the list cannot be fetched or decoded. `verifyCredentialStatuses` checks
  several credentials sequentially in input order. Both are available as `OpenID4VCSDK.verifyCredentialStatus` and
  `OpenID4VCSDK.verifyCredentialStatuses`, accept a stored `SdJwtVcRecord` or a compact SD-JWT VC, and use the agent's
  configured `fetch`. The `@owf/token-status-list` decoder Credo already depends on is now a direct dependency.
- c09196b: Add holder-side credential decode helpers.
  
  `decodeSdJwt(agent, jwt)` and `decodeMdocCredential(base64Url)` parse a compact SD-JWT VC and a base64url issuer-signed
  mdoc respectively, without storing or verifying them. `OpenID4VCSDK.decodeSdJwt({ jwt })` and
  `OpenID4VCSDK.decodeMdocCredential({ base64Url })` provide the same helpers for apps that use the SDK instance.
  Empty input and malformed mdocs throw the exported `CredentialDecodeError`.
- a1d0ec2: Send OID4VCI wallet notifications (OpenID4VCI 1.0 §11) to the issuer's `notification_endpoint`.
  
  - `receiveCredentialFromOpenId4VciOffer` keeps a `notification` context (notification id, access token, DPoP) on each returned credential. Notifications are on by default; pass `sendNotification: false` to turn them off.
  - New `sendCredentialNotification({ credential, event })` and `sendCredentialNotifications({ notifications })` send `credential_accepted`, `credential_failure` or `credential_deleted` after the app stores, fails to store, or deletes a credential.
  - New `storeOpenIdCredentialsAndNotify({ credentials })` stores the received credentials and sends `credential_accepted` or `credential_failure` for each of them.
  - Notifications go out one at a time with a timeout (`notificationTimeoutMs`, default 5000 ms). After a timeout, the rest of that batch is skipped. A notification that is not sent is returned as `skipped` or `failed` (with the issuer's HTTP status and error code) and never throws.
  - When the `holderDidUrl` subject check fails, `credential_failure` is sent for each credential before the error is thrown.
- e34939d: Add readable OID4VCI holder errors.
  
  `resolveOpenId4VciOffer`, both access-token methods and `receiveCredentialFromOpenId4VciOffer` now translate known
  issuer and Credo failures into a `ReadableHolderError` with a stable `code`, a platform-compatible `status`, a
  user-facing message and the original technical text. `readableHolderError` and `withReadableErrors` are exported for
  apps that need to map errors from their own holder calls. Unknown errors and biometric cancellations pass through
  unchanged.
- 7b386c2: Align the mobile SDK with CREDEBL Platform v2.3.0 and agent-controller v2.3.3.
  
  - Upgrade the Credo stack from 0.7.0 to 0.7.4 and `@owf/mdoc` from 0.6 to 0.8.3.
  - Add wallet-side `ldp_vc` support for OID4VCI issuance, DCQL selection, and OID4VP presentation.
  - Use the stored W3C credential claim format (`JwtVc` or `LdpVc`) when selecting credentials for DCQL.
  - Show `ldp_vc` placeholders for unsatisfied DCQL queries.
  - Bind credentials to an existing holder DID with `holderDidUrl` and `bindingPolicy` on `receiveCredentialFromOpenId4VciOffer`, including issuer capability checks and W3C subject verification.
  - Carry the Credo 0.7.4 patches used by agent-controller 2.3.2 for `ldp_vc` record lookup, signature-suite selection, JWA proof algorithms, optional W3C `id`/`expirationDate`, JSON-LD signing, and DIDComm forward messages.
  - Adapt mdoc disclosure limiting to the `@owf/mdoc` 0.8 API.
- 445e15e: Add credential-aware OID4VCI authorization scopes.
  
  `resolveOpenId4VciOffer` now accepts an optional `credentialConfigurationIdsToRequest` list. When supplied, the
  authorization request carries only the scopes of the selected credential configurations instead of every configuration
  the issuer offered. The exported `getScopesForCredentialConfigurationIds` helper implements the filtering and throws
  `UnknownCredentialConfigurationIdError` for IDs that are not offered. Omitting the list preserves existing behaviour.

### Patch Changes

- e34939d: Improve OID4VCI notification diagnostics for post-expiry failures.
  
  A notification skipped because the issuance access token expired now names the event that was dropped. An issuer
  `HTTP 401` response now explains that the token is no longer accepted and that the notification cannot be retried,
  instead of surfacing a bare status. Documentation covers the case where the issuer omits `expires_in`.
- c807af4: Correct the package READMEs.
  
  - Fix examples that used invalid options, wrong return shapes, or undefined variables.
  - Document the provider setup needed by credential hooks, module registration, notification and status result semantics, and DigiLocker installation and React Native constraints.
- e34939d: Fix package imports and expose documented public APIs.
  
  - DIDComm providers now import record helpers from `@credebl/ssi-mobile-core` instead of the undeclared `@credebl/core` alias.
  - Export the standalone DIDComm module APIs (`ConnectionsApi`, `CredentialsApi`, `ProofsApi`, `BasicMessagesApi`, `QuestionAnswerApi`, `MediationRecipientApi`) from the package root.
  - Export `AgentProvider` as a named export from `@credebl/ssi-mobile-core`.
  - Export metadata helpers, holder-binding helpers and biometric error classes from `@credebl/ssi-mobile-openid4vc`.
  - Export the DigiLocker data interfaces and correct the package name/version in the README and release notes.
- 4abf721: Upgrade the transitive `@stablelib/ed25519` dependency to 2.1.1 to fix signature malleability.
  
  Credo 0.7.4 allows `@stablelib/ed25519` 2.0.2, whose verifier accepts a second signature `(R, S + L)` for any valid
  signature `(R, S)`. That can break code that treats signature bytes as a unique identifier. A workspace override now
  forces the patched 2.1.1 release, and a regression test verifies that a malleable signature is rejected by the copy
  of the library that Credo resolves. No public API changes.
- Updated dependencies [e34939d]
- Updated dependencies [c807af4]
- Updated dependencies [e34939d]
- Updated dependencies [7b386c2]
- Updated dependencies [4abf721]
  - @credebl/ssi-mobile-core@2.3.0

## 2.2.1

### Patch Changes

- 9162700: Resolve remaining high-severity dependency advisories via pnpm overrides
  
  Add pnpm overrides (`pnpm-workspace.yaml`) that force patched versions for vulnerable
  transitive dependencies surfaced by `pnpm audit` (high severity):
  
  - `@isaacs/brace-expansion` 5.0.0 → 5.0.1
  - `brace-expansion` 1.x → 1.1.18
  - `defu` 6.1.4 → 6.1.7
  - `fast-uri` 3.0.6 → 3.1.7
  - `minimatch` 3.1.2 → 3.1.5 and 10.1.1 → 10.2.6
  - `path-to-regexp` 8.3.0 → 8.4.2
  - `picomatch` 4.0.3 → 4.0.7
  - `postcss` 8.4.49 → 8.5.28
  
  No public API changes. High-severity findings drop from 26 to 4; the remaining 4 are
  `image-size` advisories reachable only through Metro's CLI tooling, for which no patched
  release exists (`patched: <0.0.0`).
- 3bd8376: Resolve remaining GitHub Dependabot alerts via additional pnpm overrides
  
  Extends the workspace overrides to cover the remaining fixable `pnpm audit`
  findings (mostly transitive runtime dependencies):
  
  - `ajv` 8.17.1 → 8.20.0
  - `body-parser` 2.2.1 → 2.3.0
  - `decode-uri-component` 0.4.1 → 0.5.0
  - `fast-xml-parser` 4.5.7 → 5.11.1
  - `qs` 6.14.0 → 6.16.0
  - `uuid` 7.0.3 → 11.1.1 and 13.0.0 → 13.0.1
  - `valibot` 1.2.0 → 1.4.2
  - `yaml` 2.8.2 → 2.9.0
  
  No public API changes. After this change `pnpm audit` reports only unfixable
  advisories: `image-size` (4 high, via Metro tooling) and `@stablelib/ed25519`
  (1 moderate, via `@credo-ts/core`) — neither publishes a patched release
  (`patched: <0.0.0`).
- Updated dependencies [9162700]
- Updated dependencies [3bd8376]
  - @credebl/ssi-mobile-core@2.2.1

## 2.2.0

### Minor Changes

- 83e6e96: update mdoc library
- 22a3c8a: upgrade credo-ts to 0.7.0
  
  BREAKING CHANGE: All `@credo-ts/*` packages have been upgraded from `0.6.2` to `0.7.0`.
  
  - `Buffer` has been removed from the `@credebl/ssi-mobile-didcomm` exports - import it from `@credo-ts/core` directly instead
  - Apps must add `@credo-ts/*` package resolutions pointing to `0.7.0` in their root `package.json` to ensure all credo-ts packages resolve to the same versions

### Patch Changes

- 0d6d9a6: Upgrade GitHub Actions used by the CI and release workflows (no runtime code change):
  
  - `actions/checkout` v6 → v7
  - `actions/setup-node` v6 → v7
  - `pnpm/action-setup` v4 → v6
  - `changesets/action` v1 → v2 (release workflow `with:` inputs migrated to the v2 schema: `pr-title`, `commit-message`, `publish-script`, `version-script`, `create-github-releases`, `push-git-tags`)
  - `softprops/action-gh-release` v2 → v3
- Updated dependencies [aa74654]
- Updated dependencies [83e6e96]
- Updated dependencies [0d6d9a6]
- Updated dependencies [22a3c8a]
  - @credebl/ssi-mobile-core@2.2.0

## 2.1.1

### Patch Changes

- 1da61e1: add push notifications for didcomm
- Updated dependencies [1da61e1]
  - @credebl/ssi-mobile-core@2.1.1

## 2.1.0

### Minor Changes

- 254f7c6: ## Features

  ### Core (`@credebl/ssi-mobile-core`)

  - Added external DIDs support
  - Added `sign` and `verify` cryptographic methods
  - Added `createJwsCompact` method for JWS compact serialization
  - Added import and export wallet as dedicated methods
  - Added generic records method and provider
  - Added delete credential method
  - Added DIDsModule with JWK and Key DID registrars and resolvers
  - Added CacheModule with LRU caching for improved performance
  - Added DID and self-attested methods
  - Added providers support

  ### OpenID4VC (`@credebl/ssi-mobile-openid4vc`)

  - Added DC API (Digital Credentials API) support for Android with credential tag management
  - Added mdoc credential format support
  - Added OpenID4VP request handling
  - Added OpenID utilities
  - Exported `extractCredentialPlaceholderFromQueryCredential` function
  - Updated OpenID4VCSDK to support storing various credential types and acquiring authorization codes
  - Added `protocol` and `credentialId` parameters to `sendResponseForDcApi` method

  ### DIDComm (`@credebl/ssi-mobile-didcomm`)

  - Added DIDComm package with full DIDComm messaging support

  ## Dependencies

  - Replaced `@hyperledger/aries-askar-react-native` with `@openwallet-foundation/askar-react-native`

### Patch Changes

- Updated dependencies [254f7c6]
  - @credebl/ssi-mobile-core@2.1.0
