import assert from 'node:assert/strict'
import test from 'node:test'
import { registerKeyManagementBackends } from '../build/keyManagement.mjs'

const backend = (identifier) => ({ backend: identifier })
const configWithAskar = () => ({
  backends: [backend('askar')],
  registerBackend(backendToRegister) {
    this.backends.push(backendToRegister)
  },
  get defaultBackend() {
    return this.backends[0]
  },
})

test('registers custom backends after Askar without changing the default backend', () => {
  const config = configWithAskar()
  const askar = config.defaultBackend
  const secureEnvironment = backend('secureEnvironment')

  registerKeyManagementBackends(config, [secureEnvironment])

  assert.deepEqual(config.backends, [askar, secureEnvironment])
  assert.equal(config.defaultBackend, askar)
})

test('rejects an empty backend identifier', () => {
  const config = configWithAskar()

  assert.throws(() => registerKeyManagementBackends(config, [backend(' ')]), /non-empty backend identifier/)
})

test('rejects duplicate registered and requested backend identifiers', () => {
  const config = configWithAskar()

  assert.throws(() => registerKeyManagementBackends(config, [backend('askar')]), /already registered/)
  assert.throws(
    () => registerKeyManagementBackends(config, [backend('custom'), backend('custom')]),
    /already registered/
  )
})
