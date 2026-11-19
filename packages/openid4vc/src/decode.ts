import { type Agent, Mdoc, type MdocNameSpaces } from '@credo-ts/core'

/** Empty or malformed encoded credential input. */
export class CredentialDecodeError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'CredentialDecodeError'
  }
}

/** The fields of an mdoc that can be inspected without verifying it. */
export interface DecodedMdocCredential {
  namespace: MdocNameSpaces
  docType: string
  validityInfo: {
    signed: Date
    validFrom: Date
    validUntil: Date
  }
  issuerSignedCertificateChain: Uint8Array[]
}

/**
 * Decode a compact SD-JWT VC into its header, payload and disclosures.
 *
 * This only parses the credential: it does not verify its signature, issuer, holder binding or status. Use the
 * verification helpers on the agent when those checks are needed. The agent is required because Credo's
 * `sdJwtVc.fromCompact` is exposed through the agent API.
 */
export function decodeSdJwt(agent: Agent, jwt: string) {
  if (!jwt?.trim()) throw new CredentialDecodeError('A compact SD-JWT VC is required')
  return agent.sdJwtVc.fromCompact(jwt.trim())
}

/**
 * Decode a base64url-encoded ISO mdoc (the issuer-signed document) into its readable fields.
 *
 * This only parses the credential: it does not verify the issuer signature, certificate chain or validity dates.
 * `base64Url` is the encoded issuer-signed document, as found in an `MdocRecord.credentialInstances[].issuerSignedBase64Url`.
 */
export function decodeMdocCredential(base64Url: string): DecodedMdocCredential {
  if (!base64Url?.trim()) throw new CredentialDecodeError('A base64url-encoded mdoc is required')

  let mdoc: Mdoc
  try {
    mdoc = Mdoc.fromBase64Url(base64Url.trim())
  } catch (cause) {
    throw new CredentialDecodeError(
      `Unable to decode the mdoc: ${cause instanceof Error ? cause.message : String(cause)}`
    )
  }

  return {
    namespace: mdoc.issuerSignedNamespaces,
    docType: mdoc.docType,
    validityInfo: mdoc.validityInfo,
    issuerSignedCertificateChain: mdoc.issuerSignedCertificateChain,
  }
}
