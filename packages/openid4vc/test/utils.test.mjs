import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDate, isDateString } from '../build/utils/date.mjs'
import {
  InvitationQrTypesSupported,
  isOpenIdCredentialOffer,
  isOpenIdPresentationRequest,
  parseInvitationUrl,
} from '../build/utils/helpers.mjs'
import { sanitizeString } from '../build/utils/strings.mjs'
import { getHostNameFromUrl } from '../build/utils/url.mjs'

test('isDateString matches ISO yyyy-mm-dd only', () => {
  assert.ok(isDateString('2024-01-15'))
  assert.ok(isDateString('2024-12-31'))
  assert.equal(isDateString('2024-13-01'), null)
  assert.equal(isDateString('15/01/2024'), null)
  assert.equal(isDateString('2024-1-1'), false)
  assert.equal(isDateString('01/01/1990'), null)
  assert.equal(isDateString(''), false)
})

test('formatDate renders a date-only string without time', () => {
  assert.equal(formatDate('2024-01-15'), 'January 15, 2024')
  assert.equal(formatDate('2024-12-25'), 'December 25, 2024')
})

test('formatDate includes time when present', () => {
  const formatted = formatDate('2024-01-15T14:30:00.000Z')
  assert.match(formatted, /January 15, 2024/)
  assert.match(formatted, /at \d{2}:\d{2}/)
})

test('formatDate accepts a Date object and a forced includeTime option', () => {
  assert.equal(formatDate(new Date(Date.UTC(2024, 0, 15))), 'January 15, 2024')
  assert.match(formatDate('2024-01-15', { includeTime: true }), /January 15, 2024/)
  assert.match(formatDate('2024-01-15', { includeTime: true }), /at \d{2}:\d{2}/)
})

test('sanitizeString splits camelCase, underscores and capitalizes the first letter', () => {
  assert.equal(sanitizeString('givenName'), 'Given name')
  assert.equal(sanitizeString('someCamelsOnly_Values'), 'Some camels only values')
  assert.equal(sanitizeString('postalCode'), 'Postal code')
  assert.equal(sanitizeString('fullName', { startWithCapitalLetter: false }), 'full name')
})

test('getHostNameFromUrl extracts the host from various url shapes', () => {
  assert.equal(getHostNameFromUrl('https://example.com/path'), 'example.com')
  assert.equal(getHostNameFromUrl('https://sub.example.com:8443'), 'sub.example.com')
  assert.equal(getHostNameFromUrl('did:web:example.com:1234'), undefined)
  assert.equal(getHostNameFromUrl('not-a-url'), undefined)
})

test('isOpenIdCredentialOffer recognizes the supported schemes', () => {
  assert.equal(isOpenIdCredentialOffer('openid-initiate-issuance://issuer'), true)
  assert.equal(isOpenIdCredentialOffer('openid-credential-offer://issuer'), true)
  assert.equal(isOpenIdCredentialOffer('https://issuer.example.com/?credential_offer_uri=http%3A%2F%2Fx'), true)
  assert.equal(isOpenIdCredentialOffer('https://issuer.example.com/?credential_offer=abc'), true)
  assert.equal(isOpenIdCredentialOffer('openid4vp://verifier'), false)
  assert.equal(isOpenIdCredentialOffer('https://plain.example.com/'), false)
})

test('isOpenIdPresentationRequest recognizes the supported schemes', () => {
  assert.equal(isOpenIdPresentationRequest('openid://verifier'), true)
  assert.equal(isOpenIdPresentationRequest('openid-vc://verifier'), true)
  assert.equal(isOpenIdPresentationRequest('openid4vp://verifier'), true)
  assert.equal(isOpenIdPresentationRequest('https://verifier.example.com/?request_uri=http%3A%2F%2Fx'), true)
  assert.equal(isOpenIdPresentationRequest('https://verifier.example.com/?request=abc'), true)
  assert.equal(isOpenIdPresentationRequest('openid-credential-offer://issuer'), false)
  assert.equal(isOpenIdPresentationRequest('https://plain.example.com/'), false)
})

test('parseInvitationUrl categorizes credential offers and presentation requests', () => {
  const offer = parseInvitationUrl(`${InvitationQrTypesSupported.OPENID_CREDENTIAL_OFFER}//issuer.gov/offer`)
  assert.equal(offer.success, true)
  assert.equal(offer.result.type, 'openid-credential-offer')
  assert.equal(offer.result.format, 'url')

  const presentation = parseInvitationUrl(`${InvitationQrTypesSupported.OPENID4VP}//verifier.gov`)
  assert.equal(presentation.success, true)
  assert.equal(presentation.result.type, 'openid-authorization-request')
  assert.equal(presentation.result.format, 'url')
})

test('parseInvitationUrl rejects unknown invitation urls', () => {
  const result = parseInvitationUrl('https://unknown.example.com/scan')
  assert.equal(result.success, false)
  assert.match(result.error, /not recognized/)
})
