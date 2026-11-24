import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCredentialTagQuery,
  DEFAULT_CREDENTIAL_SEARCHABLE_TAGS,
  filterCredentialRecords,
  InvalidCredentialListQueryError,
  matchesCredentialSearch,
  normalizeCredentialFilterValue,
  normalizeCredentialPagination,
  sanitizeCredentialTags,
} from '../build/credentialList.mjs'

const record = (overrides = {}) => {
  const tags = overrides.tags ?? {}
  return {
    id: 'record-id',
    credentialType: 'IdentityCredential',
    tags,
    getTags() {
      return tags
    },
    ...overrides,
  }
}

test('normalizeCredentialFilterValue trims, splits and drops empty values', () => {
  assert.equal(normalizeCredentialFilterValue(undefined), undefined)
  assert.equal(normalizeCredentialFilterValue(null), undefined)
  assert.equal(normalizeCredentialFilterValue(''), undefined)
  assert.equal(normalizeCredentialFilterValue('  '), undefined)
  assert.equal(normalizeCredentialFilterValue('  abc  '), 'abc')
  assert.equal(normalizeCredentialFilterValue(0), 0)
  assert.deepEqual(normalizeCredentialFilterValue(' a, b ,, c '), ['a', 'b', 'c'])
  assert.deepEqual(normalizeCredentialFilterValue([' a ', '', null, 'b']), ['a', 'b'])
  assert.equal(normalizeCredentialFilterValue(['', '  ']), undefined)
})

test('buildCredentialTagQuery ignores search and pagination fields', () => {
  assert.deepEqual(
    buildCredentialTagQuery({
      q: 'passport',
      page: 2,
      pageSize: 10,
      tags: { custom: 'x' },
      credentialType: ' IdentityCredential ',
      vct: ' https://example.com/vct, https://other.com/vct ',
      docType: ['', 'org.example.type'],
    }),
    {
      credentialType: 'IdentityCredential',
      vct: ['https://example.com/vct', 'https://other.com/vct'],
      docType: ['org.example.type'],
    }
  )
})

test('matchesCredentialSearch searches configured tags case-insensitively, including tag keys', () => {
  const r = record({ tags: { VCT: 'https://example.com/Passport' } })
  assert.equal(matchesCredentialSearch(r, 'passport', ['vct']), true)
  assert.equal(matchesCredentialSearch(r, 'PASSPORT', ['vct']), true)
  assert.equal(matchesCredentialSearch(r, 'nomatch', ['vct']), false)
  assert.equal(matchesCredentialSearch(r, 'anything', []), false)
})

test('matchesCredentialSearch falls back to id, name, reference, issuer and credential JSON', () => {
  assert.equal(matchesCredentialSearch(record({ id: 'abc-123' }), 'ABC', ['missing']), true)
  assert.equal(matchesCredentialSearch(record({ name: 'My Card' }), 'card', []), true)
  assert.equal(matchesCredentialSearch(record({ reference: 'ref-9' }), 'REF-9', []), true)
  assert.equal(matchesCredentialSearch(record({ issuerId: 'did:example:issuer' }), 'issuer', []), true)
  assert.equal(matchesCredentialSearch(record({ credential: { nested: { secret: 'needle' } } }), 'needle', []), true)
})

test('normalizeCredentialPagination applies defaults and validates input', () => {
  assert.deepEqual(normalizeCredentialPagination({}), { page: 1, pageSize: 20 })
  assert.deepEqual(normalizeCredentialPagination({ page: '3', pageSize: '5' }), { page: 3, pageSize: 5 })
  assert.throws(() => normalizeCredentialPagination({ page: 0 }), InvalidCredentialListQueryError)
  assert.throws(() => normalizeCredentialPagination({ page: 1.5 }), /page must be an integer/)
  assert.throws(() => normalizeCredentialPagination({ pageSize: 101 }), /between 1 and 100/)
  assert.throws(() => normalizeCredentialPagination({ pageSize: -1 }), InvalidCredentialListQueryError)
})

test('filterCredentialRecords returns a plain array when no query fields are set', () => {
  const records = [record({ id: 'a' }), record({ id: 'b' })]
  const result = filterCredentialRecords(records)
  assert.ok(Array.isArray(result))
  assert.equal(result.length, 2)
  assert.equal(result[0].id, 'a')
})

test('filterCredentialRecords returns a paginated envelope with filters and serialized records', () => {
  const records = [
    record({ id: 'a', name: 'Alpha', tags: { credentialType: 'A' } }),
    record({ id: 'b', name: 'Beta', tags: { credentialType: 'B' } }),
    record({ id: 'c', name: 'Alpha 2', tags: { credentialType: 'A' } }),
  ]
  const result = filterCredentialRecords(records, { q: 'alpha', page: 1, pageSize: 1 }, [
    ...DEFAULT_CREDENTIAL_SEARCHABLE_TAGS,
    'name',
  ])

  assert.ok(!Array.isArray(result))
  assert.deepEqual(
    result.data.map((r) => r.id),
    ['a']
  )
  assert.deepEqual(result.pagination, {
    page: 1,
    pageSize: 1,
    total: 2,
    totalPages: 2,
    hasNextPage: true,
    hasPreviousPage: false,
  })
  assert.deepEqual(result.filters, { q: 'alpha' })
  // tags come from getTags(), not from the serialized copy
  assert.deepEqual(result.data[0].tags, { credentialType: 'A' })
})

test('filterCredentialRecords handles an empty result set and reports previous page', () => {
  const empty = filterCredentialRecords([], { page: 1, pageSize: 10 })
  assert.deepEqual(empty.pagination, {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const page2 = filterCredentialRecords([record({ id: 'a' }), record({ id: 'b' })], { page: 2, pageSize: 1 })
  assert.deepEqual(
    page2.data.map((r) => r.id),
    ['b']
  )
  assert.equal(page2.pagination.hasPreviousPage, true)
  assert.equal(page2.pagination.hasNextPage, false)
})

test('filterCredentialRecords keeps all filter fields in the response', () => {
  const result = filterCredentialRecords([], {
    q: '  card  ',
    credentialType: 'IdentityCredential',
    vct: ['a', 'b'],
    docType: 'org.example.type',
    types: 'Type',
    issuer: 'did:example:issuer',
    name: 'Name',
    reference: 'Ref',
    page: 1,
    pageSize: 20,
  })
  assert.deepEqual(result.filters, {
    q: 'card',
    credentialType: 'IdentityCredential',
    vct: ['a', 'b'],
    docType: 'org.example.type',
    types: 'Type',
    issuer: 'did:example:issuer',
    name: 'Name',
    reference: 'Ref',
  })
})

test('sanitizeCredentialTags drops empty and non-string tag values', () => {
  assert.equal(sanitizeCredentialTags(undefined), undefined)
  assert.equal(sanitizeCredentialTags({}), undefined)
  assert.deepEqual(
    sanitizeCredentialTags({
      plain: ' value ',
      list: [' a ', '', 42, 'b'],
      empty: '  ',
      emptyList: ['', null],
    }),
    { plain: 'value', list: ['a', 'b'] }
  )
})
