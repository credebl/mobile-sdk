import { Kms } from '@credo-ts/core'
import type { CredentialMetadata } from '../display'
import { recursivelyMapMdocAttributes } from './attributes'
import { safeCalculateJwkThumbprint } from './jwk'

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
  const { _sd_alg, _sd_hash, iss, vct, cnf, iat, exp, nbf, status, ...visibleProperties } =
    sdJwtVcPayload as SdJwtVcPayload

  const holder = cnf ? ((cnf.kid ?? cnf.jwk) ? safeCalculateJwkThumbprint(cnf.jwk as Kms.Jwk) : undefined) : undefined
  const credentialMetadata: CredentialMetadata = {
    type: vct,
    issuer: iss,
    holder,
    issuedAt: iat ? new Date(iat * 1000).toISOString() : undefined,
    validUntil: exp ? new Date(exp * 1000).toISOString() : undefined,
    validFrom: nbf ? new Date(nbf * 1000).toISOString() : undefined,
    status,
  }

  return {
    attributes: Object.fromEntries(
      Object.entries(visibleProperties).map(([key, value]) => [key, recursivelyMapMdocAttributes(value)])
    ),
    metadata: credentialMetadata,
  }
}
