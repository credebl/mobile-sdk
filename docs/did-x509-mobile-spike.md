# `did:x509` on mobile — feasibility spike

Status: **no-go for a patch port** (assessed 2026-11-20).

## Context

The platform agent service carries an SD-JWT VC patch that lets a `did:x509` issuer send its certificate chain in
the `x5c` JWT header, so a verifier can resolve the DID and validate the chain. Three files in that patch are absent
from this repo's `@credo-ts/core` patch:

- `modules/sd-jwt-vc/SdJwtVcOptions.d.mts` — adds `x5c?: X509Certificate[]` to the `did` issuer type.
- `modules/sd-jwt-vc/SdJwtVcService.mjs` — chain handling in `extractKeyFromIssuer` and `verifyIssuer`.
- `modules/sd-jwt-vc/utils.mjs` — forwards the `x509chain` resolution option and parses `x5c` + DID `kid` headers.

This spike assessed whether those files can be copied into the mobile SDK.

## Findings

1. **Node-only runtime dependencies.** The `did:x509` resolver in the platform service is backed by a package that
   imports `node:crypto`, `node:fs`, `node:module` and `fs`. Its optional native addon is a Node-API C++ binary.
   Neither works under React Native / Metro without polyfills that this SDK does not ship.
2. **`Buffer` in the patch itself.** `toX509ChainOption` calls `Buffer.from(...)`, a Node global unavailable in RN.
   This is the same hazard class as the deferred `node:crypto` usage in the DigiLocker package.
3. **Scope mismatch.** The patch is predominantly issuer-side: DID import, chain storage and SD-JWT signing. The one
   holder-relevant path — verifying a credential whose issuer is `did:x509` — still needs the external resolver and
   a chain provider, because Credo's verification helpers do not forward `x509chain` on their own.
4. **Upstream key-type gap.** Credo's key mapping rejects the spec's `JsonWebKey` verification method type. Resolving
   a `did:x509` document for Credo's own signing/verification requires an opt-in to a Credo-compatible type, which
   the resolver must be configured for.

## Decision

Do **not** port the `did:x509` patch into the DPG SDK. The SDK stays format- and jurisdiction-agnostic; a raw patch
copy would import Node-only dependencies and an issuer-oriented feature into a holder runtime.

## If this becomes necessary later

Treat it as a dedicated holder-side verification feature, not a patch port:

- Use an RN-safe resolver built on `@peculiar/x509` (already a Credo transitive dependency) rather than a Node-API
  addon or `node:crypto`.
- Replace `Buffer` with `TypedArrayEncoder`/base64url helpers, and keep chain parsing in SDK-owned code.
- Source the chain from the credential's `x5c` header and feed it to resolution explicitly; do not rely on a global
  chain provider.
- Prefer an upstream Credo implementation of `did:x509` verification over a local patch when one becomes available.
- Jurisdiction-specific trust anchors and certificate policies remain the responsibility of downstream trust and
  policy services; this SDK keeps only the generic verification engine and interfaces.
