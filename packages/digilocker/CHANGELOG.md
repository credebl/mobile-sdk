# @credebl/digilocker-mobile

## 1.1.1

### Patch Changes

- c807af4: Correct the package READMEs.
  
  - Fix examples that used invalid options, wrong return shapes, or undefined variables.
  - Document the provider setup needed by credential hooks, module registration, notification and status result semantics, and DigiLocker installation and React Native constraints.
- e34939d: Fix package imports and expose documented public APIs.
  
  - DIDComm providers now import record helpers from `@credebl/ssi-mobile-core` instead of the undeclared `@credebl/core` alias.
  - Export the standalone DIDComm module APIs (`ConnectionsApi`, `CredentialsApi`, `ProofsApi`, `BasicMessagesApi`, `QuestionAnswerApi`, `MediationRecipientApi`) from the package root.
  - Export `AgentProvider` as a named export from `@credebl/ssi-mobile-core`.
  - Export metadata helpers, holder-binding helpers and biometric error classes from `@credebl/ssi-mobile-openid4vc`.
  - Export the DigiLocker data interfaces and correct the package name/version in the README and release notes.

## 1.1.0

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

## 1.0.1

### Patch Changes

- ea0eddf: fix: package builds

## 1.0.0

### Major Changes

- 23a327e: fix: nvmrc and changelog entry

## 0.0.2

### Patch Changes

- 73355e1: chore: add changeset to release packages
