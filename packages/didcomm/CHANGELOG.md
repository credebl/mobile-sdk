# @credebl/ssi-mobile-didcomm

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
