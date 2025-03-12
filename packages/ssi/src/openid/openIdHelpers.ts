import type { Agent, CredentialExchangeRecord } from '@credo-ts/core'
import type { CredentialMetadata } from './displayProof'

import {
  ClaimFormat,
  SdJwtVcRecord,
  SdJwtVcRepository,
  W3cCredentialRecord,
  W3cCredentialRepository,
} from '@credo-ts/core'

import { getOID4VCCredentialsForProofRequest } from './resolverProof'

export type GenericCredentialExchangeRecord = CredentialExchangeRecord | W3cCredentialRecord | SdJwtVcRecord

export enum InvitationQrTypesSupported {
  OPENID = 'openid://',
  OPENID_INITIATE_ISSUANCE = 'openid-initiate-issuance://',
  OPENID_CREDENTIAL_OFFER = 'openid-credential-offer://',
  OPENID4VP = 'openid4vp://',
  OPENID_VC = 'openid-vc://',
}
export type ParseInvitationResult =
  | {
      success: true
      result: ParsedInvitation
    }
  | {
      success: false
      error: string
    }

export type ParsedInvitation = {
  type: 'openid-credential-offer' | 'openid-authorization-request'
  format: 'url' | 'parsed'
  data: string | Record<string, unknown>
}

export const isOpenIdCredentialOffer = (url: string) => {
  if (
    url.startsWith(InvitationQrTypesSupported.OPENID_INITIATE_ISSUANCE) ||
    url.startsWith(InvitationQrTypesSupported.OPENID_CREDENTIAL_OFFER)
  ) {
    return true
  }

  if (url.includes('credential_offer_uri=') || url.includes('credential_offer=')) {
    return true
  }

  return false
}

export const isOpenIdPresentationRequest = (url: string) => {
  if (
    url.startsWith(InvitationQrTypesSupported.OPENID) ||
    url.startsWith(InvitationQrTypesSupported.OPENID_VC) ||
    url.startsWith(InvitationQrTypesSupported.OPENID4VP)
  ) {
    return true
  }

  if (url.includes('request_uri=') || url.includes('request=')) {
    return true
  }
  return false
}

export function parseInvitationUrl(invitationUrl: string): ParseInvitationResult {
  if (isOpenIdCredentialOffer(invitationUrl)) {
    return {
      success: true,
      result: {
        format: 'url',
        type: 'openid-credential-offer',
        data: invitationUrl,
      },
    }
  }

  if (isOpenIdPresentationRequest(invitationUrl)) {
    return {
      success: true,
      result: {
        format: 'url',
        type: 'openid-authorization-request',
        data: invitationUrl,
      },
    }
  }
  return {
    success: false,
    error: 'Invitation not recognized.',
  }
}

export type JffW3cCredentialJson = W3cCredentialJson & {
  name?: string
  description?: string
  credentialBranding?: {
    backgroundColor?: string
  }

  issuer:
    | string
    | (W3cIssuerJson & {
        name?: string
        iconUrl?: string
        logoUrl?: string
        image?: string | { id?: string; type?: 'Image' }
      })
}

export interface DisplayImage {
  url?: string
  altText?: string
}

export interface CredentialDisplay {
  name: string
  locale?: string
  description?: string
  textColor?: string
  backgroundColor?: string
  backgroundImage?: DisplayImage
  issuer: CredentialIssuerDisplay
}

export interface CredentialIssuerDisplay {
  name: string
  locale?: string
  logo?: DisplayImage
}

export function getHostOpenIdNameFromUrl(url: string) {
  return url.split('https://')[1]
}
export const sanitizeString = (str: string) => {
  const result = str.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  let words = result.split(' ')
  words = words.map((word, index) => {
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    }
    return word.charAt(0).toLowerCase() + word.slice(1)
  })
  return words.join(' ')
}

export type CredentialForDisplayId = `w3c-credential-${string}` | `sd-jwt-vc-${string}`

export type W3cIssuerJson = {
  id: string
}

export type W3cCredentialSubjectJson = {
  id?: string
  [key: string]: unknown
}

export type W3cCredentialJson = {
  type: string[]
  issuer: W3cIssuerJson
  issuanceDate: string
  expiryDate?: string
  credentialSubject: W3cCredentialSubjectJson | W3cCredentialSubjectJson[]
}

export type W3cCredentialDisplay = {
  id: string
  createdAt: Date
  display: CredentialDisplay
  credential?: W3cCredentialJson
  attributes: W3cCredentialSubjectJson
  metadata?: CredentialMetadata
  claimFormat?: ClaimFormat
}

export const isW3CCredentialRecord = (record: W3cCredentialRecord) => {
  return record.getTags()?.claimFormat === ClaimFormat.JwtVc
}

export const filterW3CCredentialsOnly = (credentials: W3cCredentialRecord[]) => {
  return credentials.filter((r) => isW3CCredentialRecord(r))
}

export type OpenIDCredentialRecord = W3cCredentialRecord | SdJwtVcRecord | undefined

export type OpenIDCredentialContext = {
  openIdState: OpenIDCredentialRecordState
  storeOpenIdCredential: (agent: Agent, cred: W3cCredentialRecord | SdJwtVcRecord) => Promise<void>
  removeCredential: (agent: Agent, cred: W3cCredentialRecord | SdJwtVcRecord) => Promise<void>
}

export type OpenIDCredentialRecordState = {
  openIDCredentialRecords: OpenIDCredentialRecord[]
  w3cCredentialRecords: W3cCredentialRecord[]
  sdJwtVcRecords: SdJwtVcRecord[]
  isLoading: boolean
}

export const addRecord = (
  record: W3cCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.w3cCredentialRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    w3cCredentialRecords: newRecordsState,
  }
}

export const removeRecord = (
  record: W3cCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.w3cCredentialRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    w3cCredentialRecords: newRecordsState,
  }
}

export const defaultState: OpenIDCredentialRecordState = {
  openIDCredentialRecords: [],
  w3cCredentialRecords: [],
  sdJwtVcRecords: [],
  isLoading: true,
}

function checkAgent(agent: Agent) {
  if (!agent) {
    const error = 'Agent undefined!'
    throw new Error(error)
  }
}

export async function storeOpenIdCredential(agent: Agent, cred: W3cCredentialRecord | SdJwtVcRecord): Promise<void> {
  checkAgent(agent)
  if (cred instanceof W3cCredentialRecord) {
    await agent?.dependencyManager.resolve(W3cCredentialRepository).save(agent.context, cred)
  } else {
    await agent?.dependencyManager.resolve(SdJwtVcRepository).save(agent.context, cred)
  }
}

export async function removeCredential(agent: Agent, cred: W3cCredentialRecord | SdJwtVcRecord) {
  checkAgent(agent)
  if (cred instanceof W3cCredentialRecord) {
    await agent?.w3cCredentials.removeCredentialRecord(cred.id)
  } else if (cred instanceof SdJwtVcRecord) {
    await agent?.sdJwtVc.deleteById(cred.id)
  }
}

export const resolveOpenIDPresentationRequest = async (uri: string, agent: Agent) => {
  if (!agent) {
    return
  }
  try {
    const record = await getOID4VCCredentialsForProofRequest({
      agent: agent,
      uri: uri,
    })
    return record
  } catch (err: unknown) {
    /* empty */
  }
}
