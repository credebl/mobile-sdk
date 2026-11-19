import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getScopesForCredentialConfigurationIds,
  UnknownCredentialConfigurationIdError,
} from '../build/authorization.mjs'

const offer = {
  offeredCredentialConfigurations: {
    'pid-sd-jwt': { scope: 'pid' },
    'address-mdoc': { scope: 'address' },
    'shared-one': { scope: 'shared' },
    'shared-two': { scope: 'shared' },
    'no-scope': {},
  },
}

test('without IDs, all offered scopes are used', () => {
  assert.deepEqual(getScopesForCredentialConfigurationIds(offer), ['pid', 'address', 'shared'])
})

test('only the scopes of the requested configurations are used', () => {
  assert.deepEqual(getScopesForCredentialConfigurationIds(offer, ['address-mdoc']), ['address'])
  assert.deepEqual(getScopesForCredentialConfigurationIds(offer, ['pid-sd-jwt', 'address-mdoc']), ['pid', 'address'])
})

test('duplicate scopes across configurations are removed', () => {
  assert.deepEqual(getScopesForCredentialConfigurationIds(offer, ['shared-one', 'shared-two']), ['shared'])
  assert.deepEqual(getScopesForCredentialConfigurationIds(offer, ['pid-sd-jwt', 'shared-one', 'shared-two']), [
    'pid',
    'shared',
  ])
})

test('configurations without a scope do not add an entry', () => {
  assert.deepEqual(getScopesForCredentialConfigurationIds(offer, ['no-scope']), [])
})

test('an empty ID list requests no scopes', () => {
  assert.deepEqual(getScopesForCredentialConfigurationIds(offer, []), [])
})

test('unknown configuration IDs are rejected instead of silently ignored', () => {
  assert.throws(
    () => getScopesForCredentialConfigurationIds(offer, ['pid-sd-jwt', 'not-offered']),
    (error) => {
      assert.ok(error instanceof UnknownCredentialConfigurationIdError)
      assert.deepEqual(error.credentialConfigurationIds, ['not-offered'])
      assert.match(error.message, /not-offered/)
      return true
    }
  )
})
