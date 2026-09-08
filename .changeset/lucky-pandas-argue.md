---
'@credebl/ssi-mobile-core': patch
'@credebl/ssi-mobile-didcomm': patch
'@credebl/ssi-mobile-openid4vc': patch
---

Resolve remaining high-severity dependency advisories via pnpm overrides

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