import type { Mdoc, MdocRecord, SdJwtVcRecord, W3cCredentialRecord, W3cV2CredentialRecord } from '@credo-ts/core'
import type {
  OpenId4VciCredentialConfigurationSupported,
  OpenId4VciCredentialConfigurationSupportedWithFormats,
  OpenId4VciCredentialIssuerMetadataDisplay,
} from '@credo-ts/openid4vc'
import { type CredentialDisplay, getOpenId4VcCredentialDisplay } from '../display'

export type CredentialDisplayClaims =
  | (OpenId4VciCredentialConfigurationSupportedWithFormats & {
    format: 'vc+sd-jwt'
  })['claims']
  | (OpenId4VciCredentialConfigurationSupportedWithFormats & {
    format: 'dc+sd-jwt'
  })['claims']

export type OpenId4VciCredentialDisplayClaims = NonNullable<
  (OpenId4VciCredentialConfigurationSupportedWithFormats & {
    format: 'dc+sd-jwt'
  })['credential_metadata']
>['claims']

export type OpenId4VciCredentialDisplay = NonNullable<
  OpenId4VciCredentialConfigurationSupported['credential_metadata']
>['display']

export interface OpenId4VcCredentialMetadata {
  credential: {
    display?: OpenId4VciCredentialDisplay
    claims?: OpenId4VciCredentialDisplayClaims
    order?: OpenId4VciCredentialConfigurationSupportedWithFormats['order']
  }
  issuer: {
    display?: OpenId4VciCredentialIssuerMetadataDisplay[]
    id: string
  }
}

export const openId4VcCredentialMetadataKey = '_credebl/openId4VcCredentialMetadata'

export function extractOpenId4VcCredentialMetadata(
  credentialMetadata: OpenId4VciCredentialConfigurationSupportedWithFormats,
  serverMetadata: { display?: OpenId4VciCredentialIssuerMetadataDisplay[]; id: string }
): OpenId4VcCredentialMetadata {
  const claims = credentialMetadata.credential_metadata?.claims ?? credentialMetadata.claims

  return {
    credential: {
      display:
        credentialMetadata.credential_metadata?.display ?? (credentialMetadata.display as OpenId4VciCredentialDisplay),
      claims: Array.isArray(claims) ? (claims as OpenId4VciCredentialDisplayClaims) : undefined,
    },
    issuer: {
      display: serverMetadata.display,
      id: serverMetadata.id,
    },
  }
}

/**
 * Gets the OpenId4Vc credential metadata from the given credential record.
 */
export function getOpenId4VcCredentialMetadata(
  credentialRecord: W3cCredentialRecord | SdJwtVcRecord | MdocRecord
): OpenId4VcCredentialMetadata | null {
  const recordMetadata: OpenId4VcCredentialMetadata | null =
    credentialRecord.metadata.get(openId4VcCredentialMetadataKey)

  if (!recordMetadata) return null

  return {
    issuer: {
      ...recordMetadata.issuer,
      display: recordMetadata.issuer.display?.map(({ logo, ...displayRest }) => ({
        ...displayRest,
        // We need to map the url values to uri
        logo: logo ? { ...logo, uri: logo.uri ?? (logo.url as string) } : undefined,
      })),
    },
    credential: {
      ...recordMetadata.credential,
      display: recordMetadata.credential.display?.map(({ background_image, logo, ...displayRest }) => ({
        ...displayRest,
        // We need to map the url values to uri
        background_image: background_image
          ? { ...background_image, uri: background_image.uri ?? (background_image.url as string) }
          : undefined,
        // We need to map the url values to uri
        logo: logo ? { ...logo, uri: logo.uri ?? (logo.url as string) } : undefined,
      })),
    },
  }
}

export function getMdocCredentialDisplay(mdoc: Mdoc, openId4VcMetadata?: OpenId4VcCredentialMetadata | null) {
  let credentialDisplay: Partial<CredentialDisplay> = {}

  if (openId4VcMetadata) {
    credentialDisplay = getOpenId4VcCredentialDisplay(openId4VcMetadata)
  }

  return {
    ...credentialDisplay,
    // If there's no name for the credential, we extract it from the doctype
    name: credentialDisplay.name ?? mdoc.docType,
  }
}

/**
 * Sets the OpenId4Vc credential metadata on the given credential record
 */
export function setOpenId4VcCredentialMetadata(
  credentialRecord: W3cCredentialRecord | SdJwtVcRecord | MdocRecord | W3cV2CredentialRecord,
  metadata: OpenId4VcCredentialMetadata
) {
  credentialRecord.metadata.set(openId4VcCredentialMetadataKey, metadata)
}
