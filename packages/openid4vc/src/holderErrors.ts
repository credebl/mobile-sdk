/**
 * Stable, machine-readable reasons why an OID4VCI holder operation could not be completed.
 * The matching human-readable message is available on {@link ReadableHolderError.message}.
 */
export type HolderErrorCode =
  | 'TRANSACTION_CODE_REQUIRED'
  | 'CREDENTIAL_OFFER_UNAVAILABLE'
  | 'ISSUER_METADATA_UNAVAILABLE'
  | 'UNTRUSTED_CREDENTIAL_ROOT'
  | 'CREDENTIAL_NOT_VALID_NOW'
  | 'CREDENTIAL_SIGNED_OUTSIDE_CERTIFICATE_VALIDITY'
  | 'CREDENTIAL_COUNTRY_MISMATCH'
  | 'ISSUER_CERTIFICATE_COUNTRY_MISSING'
  | 'DID_BINDING_UNSUPPORTED_FOR_MDOC'

/**
 * A known OID4VCI holder failure, rewritten into a message that can be shown to a wallet user.
 *
 * `code` is stable and suitable for branching on. `status` mirrors the platform error taxonomy
 * for apps that report holder failures back to an issuer or verifier. `originalMessage` keeps the
 * technical Credo/issuer text for diagnostics; it is also appended to `message` in brackets.
 */
export class ReadableHolderError extends Error {
  public readonly code: HolderErrorCode
  public readonly status: number
  public readonly originalMessage: string

  public constructor(options: {
    code: HolderErrorCode
    status: number
    message: string
    originalMessage: string
  }) {
    const original = options.originalMessage.replace(/\s+/g, ' ').trim()
    super(`${options.message} [${original}]`)
    this.name = 'ReadableHolderError'
    this.code = options.code
    this.status = options.status
    this.originalMessage = original
  }
}

interface Rule {
  readonly pattern: RegExp
  readonly code: HolderErrorCode
  readonly status: number
  readonly message: (match: RegExpMatchArray) => string
}

// First match wins. These are the texts the holder libraries and platform issuers actually emit.
const RULES: readonly Rule[] = [
  {
    pattern: /Retrieving access token requires a 'tx_code'/,
    code: 'TRANSACTION_CODE_REQUIRED',
    status: 400,
    message: () => 'This offer needs a transaction code (PIN). Ask the issuer for it and send it as txCode.',
  },
  {
    pattern: /Fetching credential offer from '[^']*' resulted in an unsuccessful response with status '404'/,
    code: 'CREDENTIAL_OFFER_UNAVAILABLE',
    status: 404,
    message: () =>
      'This credential offer was already used, has expired or was withdrawn. An offer works only once: ask the issuer for a new one.',
  },
  {
    pattern: /Fetching well known metadata from '([^']*)' resulted in an unsuccessful response with status '(\d+)'/,
    code: 'ISSUER_METADATA_UNAVAILABLE',
    status: 502,
    message: (match) =>
      `The issuer's configuration could not be read (${match[1]} answered ${match[2]}). Tell the issuer: no credential can be issued until it is fixed.`,
  },
  {
    pattern: /No trusted certificate was found while validating the X\.509 chain/,
    code: 'UNTRUSTED_CREDENTIAL_ROOT',
    status: 422,
    message: () =>
      "This wallet does not trust the certificate that signed the credential. The issuer's root certificate has to be in the wallet's trust list.",
  },
  {
    pattern: /The MSO must be valid at the time of verification .*its validity period is (.+?) to (.+?) \(/,
    code: 'CREDENTIAL_NOT_VALID_NOW',
    status: 422,
    message: (match) =>
      `The credential is not valid at this time. It is valid from ${match[1]} to ${match[2]}. The issuer may need to issue it with other dates.`,
  },
  {
    pattern: /The MSO signed date .* must be within the validity period of the certificate/,
    code: 'CREDENTIAL_SIGNED_OUTSIDE_CERTIFICATE_VALIDITY',
    status: 422,
    message: () => 'The credential was signed outside the validity of the certificate that signed it.',
  },
  {
    pattern: /The 'issuing_country' \((.+?)\) must match the 'countryName'/,
    code: 'CREDENTIAL_COUNTRY_MISMATCH',
    status: 422,
    message: (match) =>
      `The credential's issuing country (${match[1]}) does not match the country of the certificate that signed it. The issuer has to fix the credential or use a certificate of the same country.`,
  },
  {
    pattern: /Country name \(C\) must be present in the issuer certificate/,
    code: 'ISSUER_CERTIFICATE_COUNTRY_MISSING',
    status: 422,
    message: () =>
      'The certificate that signed this credential has no country (C) in its subject, which an mDoc requires. The issuer needs a certificate with a country.',
  },
  {
    pattern: /Using a did for credential binding is not supported for the 'mso_mdoc' format/,
    code: 'DID_BINDING_UNSUPPORTED_FOR_MDOC',
    status: 422,
    message: () =>
      'An mDoc can be bound to a key but not to a DID. The issuer has to offer key (jwk) binding for this credential.',
  },
]

/**
 * Return a readable error when `error` is one of the known holder failures, otherwise `undefined`.
 * Non-`Error` values and unknown messages are intentionally left untouched.
 */
export function readableHolderError(error: unknown): ReadableHolderError | undefined {
  if (!(error instanceof Error)) return undefined

  const originalMessage = error.message
  for (const rule of RULES) {
    const match = originalMessage.match(rule.pattern)
    if (match) {
      return new ReadableHolderError({
        code: rule.code,
        status: rule.status,
        message: rule.message(match),
        originalMessage,
      })
    }
  }
  return undefined
}

/** Run a holder call, replacing a known failure with a readable one. Unknown errors are rethrown unchanged. */
export async function withReadableErrors<Result>(run: () => Promise<Result>): Promise<Result> {
  try {
    return await run()
  } catch (error) {
    throw readableHolderError(error) ?? error
  }
}
