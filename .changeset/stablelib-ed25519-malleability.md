---
'@credebl/ssi-mobile-core': patch
'@credebl/ssi-mobile-didcomm': patch
'@credebl/ssi-mobile-openid4vc': patch
---

Upgrade the transitive `@stablelib/ed25519` dependency to 2.1.1 to fix signature malleability.

Credo 0.7.4 allows `@stablelib/ed25519` 2.0.2, whose verifier accepts a second signature `(R, S + L)` for any valid
signature `(R, S)`. That can break code that treats signature bytes as a unique identifier. A workspace override now
forces the patched 2.1.1 release, and a regression test verifies that a malleable signature is rejected by the copy
of the library that Credo resolves. No public API changes.
