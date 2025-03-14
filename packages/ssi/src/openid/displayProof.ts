import type { DifPexCredentialsForRequest } from '@credo-ts/core'
import type { OpenId4VcSiopResolvedAuthorizationRequest } from '@credo-ts/openid4vc'
import type { DisplayImage } from './openIdHelpers'

import { ClaimFormat } from '@credo-ts/core'

import { filterAndMapSdJwtKeys, getCredentialForDisplay } from './display'

export interface FormattedSubmission {
  name: string
  purpose?: string
  areAllSatisfied: boolean
  entries: FormattedSubmissionEntry[]
}

export interface OpenId4VPRequestRecord extends OpenId4VcSiopResolvedAuthorizationRequest {
  verifierHostName: string | undefined
  createdAt: string | Date
  credentialsForRequest: DifPexCredentialsForRequest | undefined
  type: string
}

export enum CredentialMetadata {
  customMetadata = 'customMetadata',
  metaData = 'metaData',
}
export interface FormattedSubmissionEntry {
  /** can be either AnonCreds groupName or PEX inputDescriptorId */
  inputDescriptorId: string
  isSatisfied: boolean

  name: string
  description?: string

  credentials: {
    id: string
    credentialName: string
    issuerName?: string
    requestedAttributes?: string[]
    disclosedPayload?: Record<string, unknown>
    metadata?: CredentialMetadata
    backgroundColor?: string
    backgroundImage?: DisplayImage
    claimFormat: ClaimFormat | undefined | 'AnonCreds'
  }[]
}

export function formatDifPexCredentialsForRequest(
  credentialsForRequest: DifPexCredentialsForRequest
): FormattedSubmission {
  const entries = credentialsForRequest.requirements.flatMap((requirement) => {
    return requirement.submissionEntry.map((submission): FormattedSubmissionEntry => {
      return {
        inputDescriptorId: submission.inputDescriptorId,
        name: submission.name ?? 'Unknown',
        description: submission.purpose,
        isSatisfied: submission.verifiableCredentials.length >= 1,

        credentials: submission.verifiableCredentials.map((verifiableCredential) => {
          const { display, attributes, metadata, claimFormat } = getCredentialForDisplay(
            verifiableCredential.credentialRecord
          )

          let disclosedPayload = attributes
          if (verifiableCredential.type === ClaimFormat.SdJwtVc) {
            disclosedPayload = filterAndMapSdJwtKeys(verifiableCredential.disclosedPayload).visibleProperties
          } /* else if (verifiableCredential.type === ClaimFormat.MsoMdoc) {
            disclosedPayload = Object.fromEntries(
              Object.values(verifiableCredential.disclosedPayload).flatMap((entry) => Object.entries(entry))
            )
          } */

          return {
            id: verifiableCredential.credentialRecord.id,
            credentialName: display.name,
            issuerName: display.issuer.name,
            requestedAttributes: [...Object.keys(disclosedPayload)],
            disclosedPayload,
            metadata,
            backgroundColor: display.backgroundColor,
            backgroundImage: display.backgroundImage,
            claimFormat,
          }
        }),
      }
    })
  })

  return {
    areAllSatisfied: entries.every((entry) => entry.isSatisfied),
    name: credentialsForRequest.name ?? 'Unknown',
    purpose: credentialsForRequest.purpose,
    entries,
  }
}
