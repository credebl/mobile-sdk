import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

// These tests lock in the runtime API surface of direct dependencies that
// dependabot PRs bump, so any breaking change to the underlying library is
// caught even when network calls / native modules are unavailable.
const require = createRequire(import.meta.url)

test('axios provides the API used by digilocker HTTP helpers', () => {
  const axios = require('axios')
  assert.equal(typeof axios.get, 'function')
  assert.equal(typeof axios.post, 'function')
  assert.equal(typeof axios.create, 'function')

  const { version } = require('axios/package.json')
  // PR #116 bumps ^1.11.0 -> ^1.18.0. The axios 1.x public API used here must remain.
  assert.ok(version >= '1.11.0', `expected axios >= 1.11.0, got ${version}`)
  assert.match(version, /^1\.\d+\.\d+$/, `expected axios 1.x, got ${version}`)
})

test('crypto-js provides the API used by digilocker', () => {
  const CryptoJS = require('crypto-js')
  assert.equal(typeof CryptoJS.AES, 'object')
  assert.equal(typeof CryptoJS.AES.encrypt, 'function')
  assert.equal(typeof CryptoJS.AES.decrypt, 'function')
})

test('xml2js provides the parsing API used by digilocker', () => {
  const xml2js = require('xml2js')
  assert.equal(typeof xml2js.parseStringPromise, 'function')
  assert.equal(typeof xml2js.parseString, 'function')
})

test('uuid provides the API used by digilocker', () => {
  const { v4 } = require('uuid')
  assert.equal(typeof v4, 'function')
  assert.match(v4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})
