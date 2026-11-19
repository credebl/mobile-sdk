import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'
import { StatusList } from '@owf/token-status-list'
import { verifyCredentialStatus, verifyCredentialStatuses } from '../build/status.mjs'

const STATUS_URI = 'https://issuer.example/status'

function makeStatusListJwt(values) {
  const list = new StatusList(values, 8)
  const lst = Buffer.from(list.compressStatusListToBytes()).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ status_list: { lst, bits: 8 } })).toString('base64url')
  return `eyJhbGciOiJFUzI1NiJ9.${payload}.c2ln`
}

function makeAgent({ payload = {}, statusListJwt, fetchImpl } = {}) {
  const calls = []
  return {
    calls,
    sdJwtVc: {
      fromCompact(compact) {
        return { compact, payload }
      },
    },
    tokenStatusList: {
      async fetchTokenStatusList(options) {
        calls.push(options)
        if (fetchImpl) return fetchImpl(options)
        return { format: 'jwt', statusList: statusListJwt, parsed: {} }
      },
    },
  }
}

function withStatus(idx = 1) {
  return { status: { status_list: { idx, uri: STATUS_URI } } }
}

test('credentials without a status reference are reported as unchecked', async () => {
  const agent = makeAgent({ payload: { vct: 'example' } })
  assert.deepEqual(await verifyCredentialStatus(agent, { credential: 'compact' }), {
    checked: false,
    status: 'unknown',
    verified: true,
  })
  assert.equal(agent.calls.length, 0)
})

test('reads a valid status bit', async () => {
  const agent = makeAgent({
    payload: withStatus(0),
    statusListJwt: makeStatusListJwt([0, 1, 2]),
  })

  assert.deepEqual(await verifyCredentialStatus(agent, { credential: 'compact' }), {
    checked: true,
    status: 'valid',
    verified: true,
    statusListUri: STATUS_URI,
    statusListIndex: 0,
  })
  assert.deepEqual(agent.calls, [{ uri: STATUS_URI, acceptedFormats: ['jwt'] }])
})

test('distinguishes revoked from suspended', async () => {
  const statusListJwt = makeStatusListJwt([0, 1, 2])

  const revoked = await verifyCredentialStatus(makeAgent({ payload: withStatus(1), statusListJwt }), {
    credential: 'compact',
  })
  assert.equal(revoked.status, 'revoked')

  const suspended = await verifyCredentialStatus(makeAgent({ payload: withStatus(2), statusListJwt }), {
    credential: 'compact',
  })
  assert.equal(suspended.status, 'suspended')
})

test('fails closed when the status list cannot be fetched', async () => {
  const agent = makeAgent({
    payload: withStatus(1),
    fetchImpl: () => {
      throw new Error('network down')
    },
  })

  const result = await verifyCredentialStatus(agent, { credential: 'compact' })
  assert.equal(result.checked, true)
  assert.equal(result.status, 'unknown')
  assert.equal(result.verified, false)
  assert.equal(result.statusListUri, STATUS_URI)
  assert.equal(result.statusListIndex, 1)
  assert.equal(result.error, 'network down')
})

test('rejects unsupported status list formats', async () => {
  const agent = makeAgent({
    payload: withStatus(1),
    fetchImpl: () => ({ format: 'cwt', statusList: new Uint8Array(), parsed: {} }),
  })

  const result = await verifyCredentialStatus(agent, { credential: 'compact' })
  assert.equal(result.verified, false)
  assert.match(result.error, /Unsupported status list format 'cwt'/)
})

test('rejects an unrecognised status value', async () => {
  const agent = makeAgent({
    payload: withStatus(0),
    statusListJwt: makeStatusListJwt([3]),
  })

  const result = await verifyCredentialStatus(agent, { credential: 'compact' })
  assert.equal(result.status, 'unknown')
  assert.equal(result.verified, false)
  assert.match(result.error, /Unrecognised status value/)
})

test('reports malformed credentials without fetching a status list', async () => {
  const agent = makeAgent()
  agent.sdJwtVc.fromCompact = () => {
    throw new Error('invalid compact SD-JWT')
  }

  const result = await verifyCredentialStatus(agent, { credential: 'bad' })
  assert.deepEqual(result, {
    checked: false,
    status: 'unknown',
    verified: false,
    error: 'invalid compact SD-JWT',
  })
  assert.equal(agent.calls.length, 0)
})

test('accepts a stored SdJwtVcRecord', async () => {
  const agent = makeAgent({
    payload: withStatus(1),
    statusListJwt: makeStatusListJwt([1]),
  })
  let received
  agent.sdJwtVc.fromCompact = (compact) => {
    received = compact
    return { compact, payload: withStatus(0) }
  }

  const credential = { credentialInstances: [{ compactSdJwtVc: 'record-compact' }] }
  await verifyCredentialStatus(agent, { credential })
  assert.equal(received, 'record-compact')
})

test('checks several credentials sequentially in input order', async () => {
  const statusListJwt = makeStatusListJwt([0, 1, 2])
  const agent = makeAgent({ payload: withStatus(0), statusListJwt })
  const order = []
  agent.tokenStatusList.fetchTokenStatusList = async (options) => {
    order.push(options.uri)
    return { format: 'jwt', statusList: statusListJwt, parsed: {} }
  }

  const credentials = ['first', 'second', 'third']
  let call = 0
  agent.sdJwtVc.fromCompact = (compact) => {
    call += 1
    return { compact, payload: withStatus(call - 1) }
  }

  const results = await verifyCredentialStatuses(agent, { credentials })
  assert.deepEqual(
    results.map((result) => result.status),
    ['valid', 'revoked', 'suspended']
  )
  assert.deepEqual(order, [STATUS_URI, STATUS_URI, STATUS_URI])
})
