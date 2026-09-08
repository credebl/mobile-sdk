---
'@credebl/ssi-mobile-core': patch
'@credebl/ssi-mobile-didcomm': patch
'@credebl/ssi-mobile-openid4vc': patch
---

Upgrade GitHub Actions used by the CI and release workflows (no runtime code change):

- `actions/checkout` v6 → v7
- `actions/setup-node` v6 → v7
- `pnpm/action-setup` v4 → v6
- `changesets/action` v1 → v2 (release workflow `with:` inputs migrated to the v2 schema: `pr-title`, `commit-message`, `publish-script`, `version-script`, `create-github-releases`, `push-git-tags`)
- `softprops/action-gh-release` v2 → v3