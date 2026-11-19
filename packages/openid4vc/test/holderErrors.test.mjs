import assert from 'node:assert/strict'
import test from 'node:test'

import { ReadableHolderError, readableHolderError, withReadableErrors } from '../build/holderErrors.mjs'

const readable = (message) => {
  const result = readableHolderError(new Error(message))
  assert.ok(result, `not recognised: ${message}`)
  return result
}

test('explains a missing transaction code', () => {
  const error = readable(
    "Retrieving access token requires a 'tx_code' in the request, but the 'txCode' parameter was not provided."
  )
  assert.equal(error.code, 'TRANSACTION_CODE_REQUIRED')
  assert.equal(error.status, 400)
  assert.match(error.message, /needs a transaction code \(PIN\)/)
})

test('explains an offer that can no longer be fetched', () => {
  const error = readable(
    "Fetching credential offer from 'http://localhost:4001/oid4vci/x/offers/1' resulted in an unsuccessful response with status '404'"
  )
  assert.equal(error.code, 'CREDENTIAL_OFFER_UNAVAILABLE')
  assert.equal(error.status, 404)
  assert.match(error.message, /already used, has expired or was withdrawn/)
})

test('names the issuer address and status when its metadata cannot be read', () => {
  const error = readable(
    "Fetching well known metadata from 'http://localhost:4001/.well-known/openid-credential-issuer/oid4vci/x' resulted in an unsuccessful response with status '500'."
  )
  assert.equal(error.code, 'ISSUER_METADATA_UNAVAILABLE')
  assert.equal(error.status, 502)
  assert.match(error.message, /answered 500/)
})

test('explains an untrusted X.509 root', () => {
  const error = readable(
    'Failed to validate mdoc credential(s). \n - (0) No trusted certificate was found while validating the X.509 chain'
  )
  assert.equal(error.code, 'UNTRUSTED_CREDENTIAL_ROOT')
  assert.equal(error.status, 422)
  assert.match(error.message, /does not trust the certificate that signed the credential/)
})

test('says when the credential is not valid at this time, with the dates', () => {
  const error = readable(
    'The MSO must be valid at the time of verification (Mon, 09 Nov 2026 19:14:40 GMT); its validity period is Mon, 09 Nov 2026 19:18:40 GMT to Wed, 09 Dec 2026 19:14:40 GMT (allowed clock skew 30s)'
  )
  assert.equal(error.code, 'CREDENTIAL_NOT_VALID_NOW')
  assert.match(error.message, /valid from Mon, 09 Nov 2026 19:18:40 GMT to Wed, 09 Dec 2026 19:14:40 GMT/)
})

test('explains the remaining mDoc certificate and binding checks', () => {
  const signedOutside = readable(
    'The MSO signed date (Mon, 09 Nov 2026 19:00:00 GMT) must be within the validity period of the certificate'
  )
  assert.equal(signedOutside.code, 'CREDENTIAL_SIGNED_OUTSIDE_CERTIFICATE_VALIDITY')
  assert.equal(signedOutside.status, 422)

  const countryMismatch = readable(
    "Failed to validate mdoc credential(s). \n - (0) The 'issuing_country' (IN) must match the 'countryName' (US) in the subject field"
  )
  assert.equal(countryMismatch.code, 'CREDENTIAL_COUNTRY_MISMATCH')
  assert.match(countryMismatch.message, /issuing country \(IN\)/)

  const noCountry = readable("(0) Country name (C) must be present in the issuer certificate's subject")
  assert.equal(noCountry.code, 'ISSUER_CERTIFICATE_COUNTRY_MISSING')
  assert.match(noCountry.message, /has no country \(C\)/)

  const didBinding = readable("Using a did for credential binding is not supported for the 'mso_mdoc' format.")
  assert.equal(didBinding.code, 'DID_BINDING_UNSUPPORTED_FOR_MDOC')
  assert.equal(didBinding.status, 422)
})

test('keeps the original technical text for diagnostics', () => {
  const message = 'No trusted certificate was found while validating the X.509 chain'
  const error = readable(`Failed to validate mdoc credential(s). \n - (0) ${message}`)
  assert.equal(error.originalMessage, `Failed to validate mdoc credential(s). - (0) ${message}`)
  assert.ok(error.message.endsWith(`[${error.originalMessage}]`))
})

test('leaves unknown errors and non-errors alone', () => {
  assert.equal(readableHolderError(new Error('something else')), undefined)
  assert.equal(readableHolderError('not an error'), undefined)
  assert.equal(readableHolderError(undefined), undefined)
})

test('withReadableErrors passes results through and only rewrites known failures', async () => {
  await assert.equal(await withReadableErrors(async () => 'ok'), 'ok')

  await assert.rejects(
    withReadableErrors(async () => {
      throw new Error('No trusted certificate was found while validating the X.509 chain')
    }),
    (error) => error instanceof ReadableHolderError && error.code === 'UNTRUSTED_CREDENTIAL_ROOT'
  )

  const unknown = new Error('boom')
  await assert.rejects(
    withReadableErrors(async () => {
      throw unknown
    }),
    (error) => error === unknown
  )
})
