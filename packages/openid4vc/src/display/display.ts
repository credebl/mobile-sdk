import {
  ClaimFormat,
  JsonTransformer,
  type Mdoc,
  type MdocNameSpaces,
  SdJwtVcRecord,
  type SdJwtVcTypeMetadata,
  type SingleOrArray,
  getJwkFromKey,
} from '@credo-ts/core'

import { type JwkJson, MdocRecord, W3cCredentialRecord } from '@credo-ts/core'
import {
  type OpenId4VcCredentialMetadata,
  getMdocCredentialDisplay,
  getOpenId4VcCredentialMetadata,
  getRefreshCredentialMetadata,
} from '../metadata'
import { formatDate, getHostNameFromUrl, sanitizeString } from '../utils'
import { safeCalculateJwkThumbprint } from '../utils/jwk'
import { getAttributesAndMetadataForSdJwtPayload } from '../utils/sdjwt'
import { recursivelyMapAttributes } from './proof'

export type CredentialForDisplayId = `w3c-credential-${string}` | `sd-jwt-vc-${string}` | `mdoc-${string}`

export interface FormattedSubmissionEntrySatisfiedCredential {
  credential: CredentialForDisplay

  /**
   * If not present the whole credential will be disclosed
   */
  disclosed: {
    attributes: CredentialForDisplay['attributes']
    metadata: CredentialForDisplay['metadata']

    paths: string[][]
  }
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
  domain?: string
  locale?: string
  logo?: DisplayImage
}

export type W3cIssuerJson = {
  id: string
}

export type W3cCredentialSubjectJson = {
  id?: string
  [key: string]: unknown
}

export type W3cCredentialJson = {
  type: Array<string>
  issuer: W3cIssuerJson
  issuanceDate: string
  expiryDate?: string
  credentialSubject: W3cCredentialSubjectJson | W3cCredentialSubjectJson[]
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
  domain?: string
  locale?: string
  logo?: DisplayImage
}

export interface CredentialMetadata {
  /**
   * vct (sd-jwt) or doctype (mdoc) or last type entry (w3c)
   */
  type: string

  /**
   * issuer identifier. did or https url
   */
  issuer?: string

  /**
   * Holder identifier. did or jwk thubmprint
   */
  holder?: string

  validUntil?: string
  validFrom?: string
  issuedAt?: string

  hasRefreshToken?: boolean

  status?: unknown
}

export interface CredentialForDisplay {
  id: CredentialForDisplayId
  createdAt: Date
  display: CredentialDisplay
  attributes: Record<string, unknown>
  rawAttributes: Record<string, unknown>
  metadata: CredentialMetadata
  claimFormat: ClaimFormat.SdJwtVc | ClaimFormat.MsoMdoc | ClaimFormat.JwtVc | ClaimFormat.LdpVc
  record: W3cCredentialRecord | MdocRecord | SdJwtVcRecord

  category?: CredentialCategoryMetadata
  hasRefreshToken: boolean
}

export interface CredentialCategoryMetadata {
  /**
   *
   */
  credentialCategory: string

  /**
   * Whether this instance of the canonical records should be displayed by default
   */
  displayPriority?: boolean

  /**
   * @default true
   */
  canDeleteCredential?: boolean
}

export interface CredentialForDisplay {
  id: CredentialForDisplayId
  createdAt: Date
  display: CredentialDisplay
  attributes: Record<string, unknown>
  rawAttributes: Record<string, unknown>
  metadata: CredentialMetadata
  claimFormat: ClaimFormat.SdJwtVc | ClaimFormat.MsoMdoc | ClaimFormat.JwtVc | ClaimFormat.LdpVc
  record: W3cCredentialRecord | MdocRecord | SdJwtVcRecord

  category?: CredentialCategoryMetadata
  hasRefreshToken: boolean
}

function findDisplay<Display extends { locale?: string; lang?: string }>(
  display?: Display[],
  preferredLocale = 'en'
): Display | undefined {
  if (!display?.length) return undefined

  let item = display.find((d) => d.locale === preferredLocale || d.lang === preferredLocale)

  if (!item && preferredLocale.includes('-')) {
    const languageOnly = preferredLocale.split('-')[0]
    item = display.find((d) => d.locale === languageOnly || d.lang === languageOnly)
  }

  if (!item) {
    item = display.find(
      (d) => d.locale?.startsWith('en-') || d.lang?.startsWith('en-') || d.locale === 'en' || d.lang === 'en'
    )
  }

  // Final fallback: first item or neutral locale
  return item || display.find((d) => !d.locale && !d.lang) || display[0]
}

export function getCredentialDisplayWithDefaults(credentialDisplay?: Partial<CredentialDisplay>): CredentialDisplay {
  return {
    ...credentialDisplay,
    name: credentialDisplay?.name ?? 'Credential',
    issuer: {
      ...credentialDisplay?.issuer,
      name: credentialDisplay?.issuer?.name ?? 'Unknown',
    },
  }
}

export function getIssuerDisplay(
  metadata: OpenId4VcCredentialMetadata | null | undefined,
  preferredLocale?: string
): Partial<CredentialIssuerDisplay> {
  const issuerDisplay: Partial<CredentialIssuerDisplay> = {}

  // Try to extract from openid metadata first
  const openidIssuerDisplay = findDisplay(
    Array.isArray(metadata?.issuer?.display) ? metadata.issuer.display : undefined,
    preferredLocale
  )

  issuerDisplay.name = openidIssuerDisplay?.name
  issuerDisplay.logo = openidIssuerDisplay?.logo
    ? ({
      url: openidIssuerDisplay.logo.url ?? '',
      altText: openidIssuerDisplay.logo.alt_text ?? '',
    } as DisplayImage)
    : {
      url: '',
      altText: '',
    }

  // Check and use credential display logo if issuerDisplay doesn't have one
  const openidCredentialDisplay = findDisplay(
    Array.isArray(metadata?.credential?.display) ? metadata.credential.display : undefined,
    preferredLocale
  )

  if (openidCredentialDisplay && !issuerDisplay.logo?.url && openidCredentialDisplay.logo) {
    issuerDisplay.logo = {
      url: (openidCredentialDisplay.logo.url as string) ?? '',
      altText: openidCredentialDisplay.logo.alt_text ?? '',
    }
  }

  return issuerDisplay
}

export function processIssuerDisplay(
  metadata: OpenId4VcCredentialMetadata | null | undefined,
  issuerDisplay: Partial<CredentialIssuerDisplay>
): CredentialIssuerDisplay {
  // Last fallback: use issuer id from openid4vc
  if (!issuerDisplay.name && metadata?.issuer.id) {
    issuerDisplay.name = getHostNameFromUrl(metadata.issuer.id)
  }

  return {
    ...issuerDisplay,
    name: issuerDisplay.name ?? 'Unknown',
  }
}

function getW3cIssuerDisplay(
  credential: W3cCredentialJson,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null
): CredentialIssuerDisplay {
  const issuerDisplay: Partial<CredentialIssuerDisplay> = {}

  // Try to extract from openid metadata first
  if (openId4VcMetadata) {
    const openidIssuerDisplay = findDisplay(openId4VcMetadata.issuer.display)

    if (openidIssuerDisplay) {
      issuerDisplay.name = openidIssuerDisplay.name

      if (openidIssuerDisplay.logo) {
        issuerDisplay.logo = {
          url: openidIssuerDisplay.logo?.uri,
          altText: openidIssuerDisplay.logo?.alt_text,
        }
      }
    }

    // If the credentialDisplay contains a logo, and the issuerDisplay does not, use the logo from the credentialDisplay
    const openidCredentialDisplay = findDisplay(openId4VcMetadata.credential.display)
    if (openidCredentialDisplay && !issuerDisplay.logo && openidCredentialDisplay.logo) {
      issuerDisplay.logo = {
        url: openidCredentialDisplay.logo?.uri,
        altText: openidCredentialDisplay.logo?.alt_text,
      }
    }
  }

  // If openid metadata is not available, try to extract display metadata from the credential based on JFF metadata
  const jffCredential = credential as JffW3cCredentialJson
  const issuerJson = typeof jffCredential.issuer === 'string' ? undefined : jffCredential.issuer

  // Issuer Display from JFF
  if (!issuerDisplay.logo || !issuerDisplay.logo.url) {
    if (issuerJson?.logoUrl) {
      issuerDisplay.logo = {
        url: issuerJson?.logoUrl,
      }
    } else if (issuerJson?.image) {
      issuerDisplay.logo = {
        url: typeof issuerJson.image === 'string' ? issuerJson.image : issuerJson.image.id,
      }
    }
  }

  // Issuer name from JFF
  if (!issuerDisplay.name) {
    issuerDisplay.name = issuerJson?.name
  }

  // Last fallback: use issuer id from openid4vc
  if (!issuerDisplay.name && openId4VcMetadata?.issuer.id) {
    issuerDisplay.name = getHostNameFromUrl(openId4VcMetadata.issuer.id)
  }

  return {
    ...issuerDisplay,
    name: issuerDisplay.name ?? 'Unknown',
  }
}

export function getSdJwtIssuerDisplay(openId4VcMetadata?: OpenId4VcCredentialMetadata | null): CredentialIssuerDisplay {
  const issuerDisplay: Partial<CredentialIssuerDisplay> = getIssuerDisplay(openId4VcMetadata)

  return processIssuerDisplay(openId4VcMetadata, issuerDisplay)
}

export function getCredentialDisplay(
  credentialPayload: Record<string, unknown>,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null,
  preferredLocale?: string
): Partial<CredentialDisplay> {
  const credentialDisplay: Partial<CredentialDisplay> = {}

  if (openId4VcMetadata) {
    const credentialDisplays = openId4VcMetadata.credential?.display
    const openidCredentialDisplay = Array.isArray(credentialDisplays)
      ? findDisplay(credentialDisplays, preferredLocale)
      : undefined

    credentialDisplay.name = openidCredentialDisplay?.name
    credentialDisplay.description = openidCredentialDisplay?.description
    credentialDisplay.textColor = openidCredentialDisplay?.text_color
    credentialDisplay.backgroundColor = openidCredentialDisplay?.background_color
    credentialDisplay.backgroundImage = openidCredentialDisplay?.background_image
      ? {
        url: openidCredentialDisplay.background_image.url as string,
        altText: openidCredentialDisplay.background_image.alt_text as string,
      }
      : undefined
  }

  return credentialDisplay
}

export function getW3cCredentialDisplay(
  credential: W3cCredentialJson,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null
) {
  const credentialDisplay: Partial<CredentialDisplay> = getCredentialDisplay(credential, openId4VcMetadata)

  // If openid metadata is not available, try to extract display metadata from the credential based on JFF metadata
  const jffCredential = credential as JffW3cCredentialJson

  if (!credentialDisplay.name) {
    credentialDisplay.name = jffCredential.name
  }

  // If there's no name for the credential, we extract it from the last type
  // and sanitize it. This is not optimal. But provides at least something.
  if (!credentialDisplay.name && jffCredential.type.length > 1) {
    const lastType = jffCredential.type[jffCredential.type.length - 1]
    credentialDisplay.name = lastType && !lastType.startsWith('http') ? sanitizeString(lastType) : undefined
  }

  // Use background color from the JFF credential if not provided by the OID4VCI metadata
  if (!credentialDisplay.backgroundColor && jffCredential.credentialBranding?.backgroundColor) {
    credentialDisplay.backgroundColor = jffCredential.credentialBranding.backgroundColor
  }

  return {
    ...credentialDisplay,
    // Last fallback, if there's really no name for the credential, we use a generic name
    name: credentialDisplay.name ?? 'Credential',
  }
}

export function getSdJwtTypeMetadataCredentialDisplay(
  sdJwtTypeMetadata: SdJwtVcTypeMetadata,
  preferredLocale?: string
): Omit<CredentialDisplay, 'issuer' | 'name'> & { name?: string } {
  const typeMetadataDisplay = findDisplay(sdJwtTypeMetadata.display, preferredLocale)

  const credentialDisplay = {
    name: typeMetadataDisplay?.name,
    description: typeMetadataDisplay?.description,
    textColor: typeMetadataDisplay?.rendering?.simple?.text_color,
    backgroundColor: typeMetadataDisplay?.rendering?.simple?.background_color,
    backgroundImage: typeMetadataDisplay?.rendering?.simple?.logo
      ? {
        url: typeMetadataDisplay?.rendering?.simple?.logo.uri,
        altText: typeMetadataDisplay?.rendering?.simple?.logo.alt_text,
      }
      : undefined,
  }

  return credentialDisplay
}

export function getSdJwtCredentialDisplay(
  credentialPayload: Record<string, unknown>,
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null,
  typeMetadata?: SdJwtVcTypeMetadata | null,
  preferredLocal?: string
) {
  let credentialDisplay: Partial<CredentialDisplay> = {}

  // Type metadata takes precendence.
  if (typeMetadata) {
    credentialDisplay = getSdJwtTypeMetadataCredentialDisplay(typeMetadata, preferredLocal)
  } else if (openId4VcMetadata) {
    credentialDisplay = getOpenId4VcCredentialDisplay(openId4VcMetadata, preferredLocal)
  }

  // If there's no name for the credential, we extract it from the last type
  // and sanitize it. This is not optimal. But provides at least something.
  if (!credentialDisplay.name && typeof credentialPayload.vct === 'string') {
    credentialDisplay.name = sanitizeString(credentialPayload.vct)
  }

  return {
    ...credentialDisplay,
    // Last fallback, if there's really no name for the credential, we use a generic name
    name: credentialDisplay.name ?? 'Credential',
  }
}

export function filterAndMapSdJwtKeys(sdJwtVcPayload: Record<string, unknown>) {
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
    visibleProperties,
    metadata: credentialMetadata,
    raw: {
      issuedAt: iat ? new Date(iat * 1000) : undefined,
      validUntil: exp ? new Date(exp * 1000) : undefined,
      validFrom: nbf ? new Date(nbf * 1000) : undefined,
    },
  }
}

const credentialCategoryMetadataKey = '_credebl/credentialCategoryMetadata'

export function getCredentialCategoryMetadata(
  credentialRecord: W3cCredentialRecord | SdJwtVcRecord | MdocRecord
): CredentialCategoryMetadata | null {
  return credentialRecord.metadata.get(credentialCategoryMetadataKey)
}

export function getCredentialForDisplayId(
  credentialRecord: W3cCredentialRecord | SdJwtVcRecord | MdocRecord
): CredentialForDisplayId {
  if (credentialRecord instanceof SdJwtVcRecord) {
    return `sd-jwt-vc-${credentialRecord.id}`
  }
  if (credentialRecord instanceof W3cCredentialRecord) {
    return `w3c-credential-${credentialRecord.id}`
  }
  if (credentialRecord instanceof MdocRecord) {
    return `mdoc-${credentialRecord.id}`
  }

  throw new Error('Unsupported credential record type')
}

export function getDisclosedAttributeNamesForDisplay(credential: FormattedSubmissionEntrySatisfiedCredential) {
  // from bdr we can at least show it as: Age verification. If there is a key for a nested path we can
  // also decide to include it

  // For mdoc we remove the namespaces
  if (credential.credential.claimFormat === ClaimFormat.MsoMdoc) {
    return Array.from(new Set(credential.disclosed.paths.map((path) => sanitizeString(path[1]))))
  }

  // Otherwise we take the top-level keys
  return Array.from(
    new Set(
      credential.disclosed.paths
        .filter((path): path is [string] => typeof path[0] === 'string')
        .map((path) => sanitizeString(path[0]))
    )
  )
}

export function getCredentialForDisplay(
  credentialRecord: W3cCredentialRecord | SdJwtVcRecord | MdocRecord,
  preferredLocale?: string
): CredentialForDisplay {
  const credentialCategoryMetadata = getCredentialCategoryMetadata(credentialRecord)
  const credentialForDisplayId = getCredentialForDisplayId(credentialRecord)
  const hasRefreshToken = getRefreshCredentialMetadata(credentialRecord) !== null

  if (credentialRecord instanceof SdJwtVcRecord) {
    const sdJwtVc = credentialRecord.credential

    const openId4VcMetadata = getOpenId4VcCredentialMetadata(credentialRecord)
    const sdJwtTypeMetadata = credentialRecord.typeMetadata
    const issuerDisplay = getOpenId4VcIssuerDisplay(openId4VcMetadata, preferredLocale)

    const credentialDisplay = getSdJwtCredentialDisplay(
      sdJwtVc.prettyClaims,
      openId4VcMetadata,
      sdJwtTypeMetadata,
      preferredLocale
    )
    const { attributes, metadata } = getAttributesAndMetadataForSdJwtPayload(sdJwtVc.prettyClaims)

    return {
      id: credentialForDisplayId,
      createdAt: credentialRecord.createdAt,
      display: {
        ...credentialDisplay,
        issuer: issuerDisplay,
      },
      attributes: {},
      rawAttributes: attributes,
      metadata,
      claimFormat: ClaimFormat.SdJwtVc,
      record: credentialRecord,
      category: credentialCategoryMetadata,
      hasRefreshToken,
    }
  }
  if (credentialRecord instanceof W3cCredentialRecord) {
    const credential = JsonTransformer.toJSON(
      credentialRecord.credential.claimFormat === ClaimFormat.JwtVc
        ? credentialRecord.credential.credential
        : credentialRecord.credential.toJson()
    ) as W3cCredentialJson

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const proof = (credential as any).proof as SingleOrArray<{
      type: string
      cryptosuite?: string
      verificationMethod?: string
    }>
    const firstProof = Array.isArray(proof) ? proof[0] : proof
    const isAnonCreds = firstProof.cryptosuite === 'anoncreds-2023'

    let type = credentialRecord.credential.type[credentialRecord.credential.type.length - 1]
    if (isAnonCreds) {
      type = firstProof.verificationMethod ?? type
    }

    const openId4VcMetadata = getOpenId4VcCredentialMetadata(credentialRecord)
    const issuerDisplay = getW3cIssuerDisplay(credential, openId4VcMetadata)
    const credentialDisplay = getW3cCredentialDisplay(credential, openId4VcMetadata)

    // FIXME: support credential with multiple subjects
    const credentialAttributes = Array.isArray(credential.credentialSubject)
      ? (credential.credentialSubject[0] ?? {})
      : credential.credentialSubject

    return {
      id: credentialForDisplayId,
      createdAt: credentialRecord.createdAt,
      display: {
        ...credentialDisplay,
        issuer: issuerDisplay,
      },
      attributes: credentialAttributes,
      rawAttributes: credentialAttributes,
      metadata: {
        holder: credentialRecord.credential.credentialSubjectIds[0],
        issuer: credentialRecord.credential.issuerId,
        type,
        issuedAt: new Date(credentialRecord.credential.issuanceDate).toISOString(),
        validUntil: credentialRecord.credential.expirationDate
          ? new Date(credentialRecord.credential.expirationDate).toISOString()
          : undefined,
        validFrom: new Date(credentialRecord.credential.issuanceDate).toISOString(),
      },
      claimFormat: credentialRecord.credential.claimFormat,
      record: credentialRecord,
      category: credentialCategoryMetadata,
      hasRefreshToken,
    }
  }
  if (credentialRecord instanceof MdocRecord) {
    const mdocInstance = credentialRecord.credential

    const openId4VcMetadata = getOpenId4VcCredentialMetadata(credentialRecord)
    const credentialDisplay = getMdocCredentialDisplay(mdocInstance, openId4VcMetadata)
    const issuerDisplay = getOpenId4VcIssuerDisplay(openId4VcMetadata, preferredLocale)
    const { attributes, metadata } = getAttributesAndMetadataForMdocPayload(
      mdocInstance.issuerSignedNamespaces,
      mdocInstance
    )

    return {
      id: credentialForDisplayId,
      createdAt: credentialRecord.createdAt,
      display: {
        ...credentialDisplay,
        issuer: issuerDisplay,
      },
      attributes,
      rawAttributes: attributes,
      metadata,
      claimFormat: ClaimFormat.MsoMdoc,
      record: credentialRecord,
      category: credentialCategoryMetadata,
      hasRefreshToken,
    }
  }

  throw new Error('Unsupported format')
}

export function getOpenId4VcIssuerDisplay(
  openId4VcMetadata?: OpenId4VcCredentialMetadata | null,
  preferredLocale?: string
): CredentialIssuerDisplay {
  const issuerDisplay: Partial<CredentialIssuerDisplay> = {}

  // Try to extract from openid metadata first
  if (openId4VcMetadata) {
    const openidIssuerDisplay = findDisplay(openId4VcMetadata.issuer.display, preferredLocale)

    if (openidIssuerDisplay) {
      issuerDisplay.name = openidIssuerDisplay.name

      if (openidIssuerDisplay.logo) {
        issuerDisplay.logo = {
          url: openidIssuerDisplay.logo?.uri,
          altText: openidIssuerDisplay.logo?.alt_text,
        }
      }
    }

    // If the credentialDisplay contains a logo, and the issuerDisplay does not, use the logo from the credentialDisplay
    const openidCredentialDisplay = findDisplay(openId4VcMetadata.credential.display, preferredLocale)
    if (openidCredentialDisplay && !issuerDisplay.logo && openidCredentialDisplay.logo) {
      issuerDisplay.logo = {
        url: openidCredentialDisplay.logo?.uri,
        altText: openidCredentialDisplay.logo?.alt_text,
      }
    }
  }

  // Last fallback: use issuer id from openid4vc
  if (!issuerDisplay.name && openId4VcMetadata?.issuer.id) {
    issuerDisplay.name = getHostNameFromUrl(openId4VcMetadata.issuer.id)
  }

  if (openId4VcMetadata?.issuer.id) {
    issuerDisplay.domain = getHostNameFromUrl(openId4VcMetadata.issuer.id)
  }

  return {
    ...issuerDisplay,
    name: issuerDisplay.name ?? 'Unknown',
  }
}

export function getOpenId4VcCredentialDisplay(
  openId4VcMetadata: OpenId4VcCredentialMetadata,
  preferredLocale?: string
) {
  const openidCredentialDisplay = findDisplay(openId4VcMetadata.credential.display, preferredLocale)

  const credentialDisplay: Omit<CredentialDisplay, 'name'> & { name?: string } = {
    name: openidCredentialDisplay?.name,
    description: openidCredentialDisplay?.description,
    textColor: openidCredentialDisplay?.text_color,
    backgroundColor: openidCredentialDisplay?.background_color,
    backgroundImage: openidCredentialDisplay?.background_image
      ? {
        url: openidCredentialDisplay.background_image.uri,
      }
      : undefined,
    issuer: getOpenId4VcIssuerDisplay(openId4VcMetadata, preferredLocale),
  }

  return credentialDisplay
}

export function getAttributesAndMetadataForMdocPayload(namespaces: MdocNameSpaces, mdocInstance: Mdoc) {
  const attributes: CredentialForDisplay['attributes'] = Object.fromEntries(
    Object.values(namespaces).flatMap((v) => {
      return Object.entries(v).map(([key, value]) => [key, recursivelyMapAttributes(value)])
    })
  )

  const mdocMetadata: CredentialMetadata = {
    type: mdocInstance.docType,
    holder: mdocInstance.deviceKey
      ? safeCalculateJwkThumbprint(getJwkFromKey(mdocInstance.deviceKey).toJson())
      : undefined,
    issuedAt: mdocInstance.validityInfo.signed.toISOString(),
    validFrom:
      mdocInstance.validityInfo.validFrom instanceof Date &&
        !Number.isNaN(mdocInstance.validityInfo.validFrom.getTime())
        ? mdocInstance.validityInfo.validFrom.toISOString()
        : undefined,
    validUntil:
      mdocInstance.validityInfo.validUntil instanceof Date &&
        !Number.isNaN(mdocInstance.validityInfo.validUntil.getTime())
        ? mdocInstance.validityInfo.validUntil.toISOString()
        : undefined,
  }

  return {
    attributes,
    metadata: mdocMetadata,
  }
}
