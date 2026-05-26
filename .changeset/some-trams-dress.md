---
"@credebl/ssi-mobile-openid4vc": minor
"@credebl/ssi-mobile-didcomm": minor
"@credebl/ssi-mobile-core": minor
---

upgrade credo-ts to 0.7.0

BREAKING CHANGE: All `@credo-ts/*` packages have been upgraded from `0.6.2` to `0.7.0`.

- `Buffer` has been removed from the `@credebl/ssi-mobile-didcomm` exports - import it from `@credo-ts/core` directly instead
- Apps must add `@credo-ts/*` package resolutions pointing to `0.7.0` in their root `package.json` to ensure all credo-ts packages resolve to the same version
