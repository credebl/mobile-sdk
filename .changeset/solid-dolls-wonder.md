---
"@credebl/digilocker-mobile": minor
"@credebl/ssi-mobile-openid4vc": minor
"@credebl/ssi-mobile-didcomm": minor
"@credebl/ssi-mobile-core": minor
---

## Features

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
