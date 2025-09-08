import { DateOnly, Hasher, type JwkJson, TypedArrayEncoder } from '@credo-ts/core'
import type { DifPexCredentialsForRequest } from '@credo-ts/core'
import type { OpenId4VpResolvedAuthorizationRequest } from '@credo-ts/openid4vc'
import { formatDate, isDateString } from '../utils'
import { detectImageMimeType } from '../utils/attributes'
import type { CredentialMetadata, FormattedSubmissionEntrySatisfiedCredential } from './display'

type MappedAttributesReturnType =
  | string
  | number
  | boolean
  | { [key: string]: MappedAttributesReturnType }
  | null
  | undefined
  | Array<MappedAttributesReturnType>

export interface FormattedSubmission {
  name: string
  purpose?: string
  areAllSatisfied: boolean
  entries: FormattedSubmissionEntry[]
}

export interface OpenId4VPRequestRecord extends OpenId4VpResolvedAuthorizationRequest {
  verifierHostName: string | undefined
  createdAt: string | Date
  credentialsForRequest: DifPexCredentialsForRequest | undefined
  type: string
}

export interface FormattedSubmissionEntrySatisfied {
  /**
   * can be either:
   *  - AnonCreds groupName
   *  - PEX inputDescriptorId
   *  - DCQL credential query id
   */
  inputDescriptorId: string

  name?: string
  description?: string

  /**
   * Whether the entry is satisfied
   */
  isSatisfied: true

  /**
   * Credentials that match the request entry. Wallet always needs to pick one.
   */
  credentials: [FormattedSubmissionEntrySatisfiedCredential, ...FormattedSubmissionEntrySatisfiedCredential[]]
}

export interface FormattedSubmissionEntryNotSatisfied {
  /**
   * can be either:
   *  - AnonCreds groupName
   *  - PEX inputDescriptorId
   *  - DCQL credential query id
   */
  inputDescriptorId: string

  name?: string
  description?: string

  /**
   * Whether the entry is satisfied
   */
  isSatisfied: false

  requestedAttributePaths: Array<Array<string | number | null>>
}

export type FormattedSubmissionEntry = FormattedSubmissionEntryNotSatisfied | FormattedSubmissionEntrySatisfied

export function getDisclosedAttributePathArrays(
  payload: object,
  maxDepth: number | undefined = undefined,
  prefix: string[] = []
): string[][] {
  let attributePaths: string[][] = []

  for (const [key, value] of Object.entries(payload)) {
    if (!value) continue

    // TODO: handle arrays
    const newPath = [...prefix, key]
    if (value && typeof value === 'object' && maxDepth !== 0) {
      // If the value is a nested object, recurse
      attributePaths = [
        ...attributePaths,
        ...getDisclosedAttributePathArrays(value, maxDepth !== undefined ? maxDepth - 1 : undefined, newPath),
      ]
    } else {
      // If the value is a primitive or maxDepth is reached, add the key to the list
      attributePaths.push(newPath)
    }
  }

  return attributePaths
}

export function getAttributesAndMetadataForSdJwtPayload(sdJwtVcPayload: Record<string, unknown>) {
  type SdJwtVcPayload = {
    iss: string
    cnf: Record<string, unknown>
    vct: string
    iat?: number
    nbf?: number
    exp?: number
    [key: string]: unknown
  }
  const { _sd_alg, _sd_hash, iss, vct, cnf, iat, exp, nbf, ...visibleProperties } = sdJwtVcPayload as SdJwtVcPayload

  const holder = (cnf.kid ?? cnf.jwk) ? safeCalculateJwkThumbprint(cnf.jwk as JwkJson) : undefined
  const credentialMetadata: CredentialMetadata = {
    type: vct,
    issuer: iss,
    holder,
  }

  if (iat) {
    credentialMetadata.issuedAt = formatDate(new Date(iat * 1000))
  }
  if (exp) {
    credentialMetadata.validUntil = formatDate(new Date(exp * 1000))
  }
  if (nbf) {
    credentialMetadata.validFrom = formatDate(new Date(nbf * 1000))
  }

  return {
    attributes: Object.fromEntries(
      Object.entries(visibleProperties).map(([key, value]) => [key, recursivelyMapAttributes(value)])
    ),
    metadata: credentialMetadata,
    raw: {
      issuedAt: iat ? new Date(iat * 1000) : undefined,
      validUntil: exp ? new Date(exp * 1000) : undefined,
      validFrom: nbf ? new Date(nbf * 1000) : undefined,
    },
  }
}

export function safeCalculateJwkThumbprint(jwk: JwkJson): string | undefined {
  try {
    const thumbprint = TypedArrayEncoder.toBase64URL(
      Hasher.hash(
        JSON.stringify({ k: jwk.k, e: jwk.e, crv: jwk.crv, kty: jwk.kty, n: jwk.n, x: jwk.x, y: jwk.y }),
        'sha-256'
      )
    )
    return `urn:ietf:params:oauth:jwk-thumbprint:sha-256:${thumbprint}`
  } catch (e) {
    return undefined
  }
}

export function recursivelyMapAttributes(value: unknown): MappedAttributesReturnType {
  if (value instanceof Uint8Array) {
    const imageMimeType = detectImageMimeType(value)
    if (imageMimeType) {
      return `data:${imageMimeType};base64,${TypedArrayEncoder.toBase64(value)}`
    }

    return TypedArrayEncoder.toUtf8String(value)
  }
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value

  if (value instanceof Date || value instanceof DateOnly || (typeof value === 'string' && isDateString(value))) {
    return formatDate(value instanceof DateOnly ? value.toISOString() : value)
  }
  if (typeof value === 'string') return value
  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value.entries()).map(([key, value]) => [key, recursivelyMapAttributes(value)]))
  }
  if (Array.isArray(value)) return value.map(recursivelyMapAttributes)

  return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, recursivelyMapAttributes(value)]))
}
