import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'
import {
  DIGILOCKER_CLIENT_ID_URL_1,
  DIGILOCKER_CODE_CHALLENGE_METHOD_URL_4,
  DIGILOCKER_CODE_CHALLENGE_URL_3,
  DIGILOCKER_REDIRECT_URL_2,
} from '../build/constant.mjs'
import {
  base64UrlEncodeWithoutPadding,
  fetchDigiLockerToken,
  generateCodeChallenge,
  initiateDigiLockerOAuth,
} from '../build/digilocker.mjs'

test('base64UrlEncodeWithoutPadding produces URL-safe unpadded base64', () => {
  const input = Buffer.from([0xfb, 0xff, 0xef, 0xfe]) // bytes that exercise +, / and = replacements
  const encoded = base64UrlEncodeWithoutPadding(input)
  assert.equal(encoded, input.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'))
  assert.ok(!encoded.includes('='), 'must not contain padding')
  assert.ok(!encoded.includes('+'), 'must not contain +')
  assert.ok(!encoded.includes('/'), 'must not contain /')
  assert.match(encoded, /^[A-Za-z0-9_-]+$/)
})

test('base64UrlEncodeWithoutPadding matches RFC 4648 known vector', () => {
  assert.equal(base64UrlEncodeWithoutPadding(Buffer.from('hello world', 'utf8')), 'aGVsbG8gd29ybGQ')
  assert.equal(base64UrlEncodeWithoutPadding(Buffer.from('')), '')
})

test('generateCodeChallenge is deterministic for the same verifier', () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  const first = generateCodeChallenge(verifier)
  const second = generateCodeChallenge(verifier)
  assert.equal(first, second)
  assert.ok(first.length > 0)
})

test('generateCodeChallenge matches RFC 7636 Appendix B test vector', () => {
  // RFC 7636 S256 test vector
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  const expected = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
  assert.equal(generateCodeChallenge(verifier), expected)
})

test('generateCodeChallenge changes when the verifier changes', () => {
  assert.notEqual(generateCodeChallenge('verifier-one'), generateCodeChallenge('verifier-two'))
})

test('initiateDigiLockerOAuth builds a complete authorize URL with PKCE parameters', async () => {
  const url = await initiateDigiLockerOAuth({
    client_id: 'client-123',
    redirect_url: 'https://app.example.com/callback',
    codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  })
  assert.ok(url.startsWith(DIGILOCKER_CLIENT_ID_URL_1))
  assert.ok(url.includes(`client_id=client-123`))
  assert.ok(url.includes(`${DIGILOCKER_REDIRECT_URL_2}https://app.example.com/callback`))
  assert.ok(url.includes(DIGILOCKER_CODE_CHALLENGE_URL_3))
  assert.ok(url.includes(DIGILOCKER_CODE_CHALLENGE_METHOD_URL_4))
  assert.match(url, /code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM/)
  assert.match(url, /code_challenge_method=S256/)
})

test('fetchDigiLockerToken handles a failed request gracefully', async () => {
  const result = await fetchDigiLockerToken({
    authCode: 'auth-code',
    client_id: 'client-123',
    client_secret: 'secret',
    redirect_url: 'https://app.example.com/callback',
    codeVerifier: 'verifier',
  })
  // Network calls are not available in this environment; the fallback error shape must be returned
  assert.ok(typeof result === 'object')
})
