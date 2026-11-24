import assert from 'node:assert/strict'
import test from 'node:test'
import { CredentialDecodeError, decodeMdocCredential, decodeSdJwt } from '../build/decode.mjs'

test('decodeSdJwt delegates to the agent and returns the decoded credential', () => {
  const decoded = { header: { alg: 'ES256' }, payload: { iss: 'did:example:issuer' }, disclosures: [] }
  let received
  const agent = {
    sdJwtVc: {
      fromCompact(jwt) {
        received = jwt
        return decoded
      },
    },
  }

  const result = decodeSdJwt(agent, '  eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJkaWQifQ.sig  ')

  assert.equal(received, 'eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJkaWQifQ.sig')
  assert.equal(result, decoded)
})

test('decodeSdJwt rejects an empty credential with a clear error', () => {
  const agent = { sdJwtVc: { fromCompact: () => assert.fail('should not be called') } }
  assert.throws(() => decodeSdJwt(agent, ''), CredentialDecodeError)
  assert.throws(() => decodeSdJwt(agent, '   '), /compact SD-JWT VC is required/)
})

test('decodeMdocCredential rejects an empty credential', () => {
  assert.throws(() => decodeMdocCredential(''), CredentialDecodeError)
  assert.throws(() => decodeMdocCredential('  '), /base64url-encoded mdoc is required/)
})

test('decodeMdocCredential reports malformed input as a decode error', () => {
  assert.throws(() => decodeMdocCredential('not-a-valid-mdoc'), /Unable to decode the mdoc/)
})
