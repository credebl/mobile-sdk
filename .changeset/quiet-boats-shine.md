---
'@credebl/ssi-mobile-core': patch
'@credebl/ssi-mobile-didcomm': patch
'@credebl/ssi-mobile-openid4vc': patch
---

Resolve remaining GitHub Dependabot alerts via additional pnpm overrides

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