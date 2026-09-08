# @credebl/ssi-mobile-core

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

## 2.2.0

### Minor Changes

- 83e6e96: update mdoc library
- 22a3c8a: upgrade credo-ts to 0.7.0
  
  BREAKING CHANGE: All `@credo-ts/*` packages have been upgraded from `0.6.2` to `0.7.0`.
  
  - `Buffer` has been removed from the `@credebl/ssi-mobile-didcomm` exports - import it from `@credo-ts/core` directly instead
  - Apps must add `@credo-ts/*` package resolutions pointing to `0.7.0` in their root `package.json` to ensure all credo-ts packages resolve to the same versions

### Patch Changes

- aa74654: Allow applications to register additional Credo KMS backends while preserving Askar as the default backend.
- 0d6d9a6: Upgrade GitHub Actions used by the CI and release workflows (no runtime code change):
  
  - `actions/checkout` v6 → v7
  - `actions/setup-node` v6 → v7
  - `pnpm/action-setup` v4 → v6
  - `changesets/action` v1 → v2 (release workflow `with:` inputs migrated to the v2 schema: `pr-title`, `commit-message`, `publish-script`, `version-script`, `create-github-releases`, `push-git-tags`)
  - `softprops/action-gh-release` v2 → v3

## 2.1.1

### Patch Changes

- 1da61e1: add push notifications for didcomm

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
