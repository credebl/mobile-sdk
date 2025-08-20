import { ClaimFormat, MdocRecord, SdJwtVcRecord, type VerifiableCredential, W3cCredentialRecord } from '@credo-ts/core'

export function encodeCredential(credential: VerifiableCredential): Record<string, unknown> | string {
  return credential.encoded
}

export function credentialRecordFromCredential(credential: VerifiableCredential) {
  if (credential.claimFormat === ClaimFormat.SdJwtVc) {
    return new SdJwtVcRecord({
      compactSdJwtVc: credential.compact,
      typeMetadata: credential.typeMetadata,
    })
  }

  if (credential.claimFormat === ClaimFormat.MsoMdoc) {
    return new MdocRecord({
      mdoc: credential,
    })
  }

  return new W3cCredentialRecord({
    credential,
    // We don't support expanded types right now, but would become problem when we support JSON-LD
    tags: {},
  })
}
