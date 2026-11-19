---
'@credebl/ssi-mobile-core': patch
'@credebl/ssi-mobile-didcomm': patch
'@credebl/ssi-mobile-openid4vc': patch
'@credebl/digilocker-mobile': patch
---

Fix package imports and expose documented public APIs.

- DIDComm providers now import record helpers from `@credebl/ssi-mobile-core` instead of the undeclared `@credebl/core` alias.
- Export the standalone DIDComm module APIs (`ConnectionsApi`, `CredentialsApi`, `ProofsApi`, `BasicMessagesApi`, `QuestionAnswerApi`, `MediationRecipientApi`) from the package root.
- Export `AgentProvider` as a named export from `@credebl/ssi-mobile-core`.
- Export metadata helpers, holder-binding helpers and biometric error classes from `@credebl/ssi-mobile-openid4vc`.
- Export the DigiLocker data interfaces and correct the package name/version in the README and release notes.
