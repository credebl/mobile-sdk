import { ClaimFormat, SdJwtVcRecord, type VerifiableCredential, W3cCredentialRecord } from '@credo-ts/core'

export function encodeCredential(credential: VerifiableCredential): Record<string, unknown> | string {
  return credential.encoded
}

export function credentialRecordFromCredential(credential: VerifiableCredential) {
  if (credential.claimFormat === ClaimFormat.SdJwtDc) {
    return new SdJwtVcRecord({
      credentialInstances: [
        {
          compactSdJwtVc: credential.compact,
        },
      ],
      typeMetadata: credential.typeMetadata,
    })
  }

  if (credential.claimFormat === ClaimFormat.MsoMdoc) {
    return new W3cCredentialRecord({
      credentialInstances: [
        {
          credential: credential.encoded,
        },
      ],
      tags: {},
    })
  }

  return new W3cCredentialRecord({
    credentialInstances: [
      {
        credential: credential.encoded,
      },
    ],
    tags: {},
  })
}
