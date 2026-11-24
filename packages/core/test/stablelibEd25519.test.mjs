import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

// Resolve the same copy of @stablelib/ed25519 that @credo-ts/core uses at runtime.
const requireFromRoot = createRequire(import.meta.url)
const requireFromCredo = createRequire(requireFromRoot.resolve('@credo-ts/core'))
const ed25519 = await import(pathToFileURL(requireFromCredo.resolve('@stablelib/ed25519')).href)

// Order of the Ed25519 base point, little-endian. S must be lower than L.
const GROUP_ORDER_L = Uint8Array.from([
  0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0x10,
])

function withMalleableS(signature) {
  const result = new Uint8Array(signature.length)
  result.set(signature.subarray(0, 32))
  let carry = 0
  for (let index = 0; index < 32; index++) {
    const sum = signature[32 + index] + GROUP_ORDER_L[index] + carry
    result[32 + index] = sum & 0xff
    carry = sum >> 8
  }
  return result
}

test('Ed25519 verification rejects a signature with S >= L (GHSA-x3ff-w252-2g7j)', () => {
  assert.equal(GROUP_ORDER_L.length, 32)
  const keyPair = ed25519.generateKeyPair()
  const message = new TextEncoder().encode('mobile-sdk ed25519 regression check')
  const signature = ed25519.sign(keyPair.secretKey, message)
  const malleable = withMalleableS(signature)

  assert.notDeepEqual(malleable, signature)
  assert.equal(ed25519.verify(keyPair.publicKey, message, signature), true)
  assert.equal(ed25519.verify(keyPair.publicKey, message, malleable), false)
})
