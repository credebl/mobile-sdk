import { JsonTransformer } from '@credo-ts/core'

/** Values accepted for a credential list filter. Comma-separated strings are split into arrays. */
export type CredentialFilterValue = string | string[] | number | undefined | null

/** Dynamic credential tags: string values or arrays of strings. */
export type CredentialTags = Record<string, string | string[]>

/**
 * Query accepted by credential list APIs. With no fields set, a plain array of records is returned;
 * with any field set, a paginated envelope is returned instead.
 */
export interface CredentialListQuery {
  /** Free-text search over tags and a few record fields. */
  q?: string
  page?: number | string
  pageSize?: number | string
  credentialType?: string
  vct?: CredentialFilterValue
  docType?: CredentialFilterValue
  types?: CredentialFilterValue
  issuer?: CredentialFilterValue
  name?: CredentialFilterValue
  reference?: CredentialFilterValue
  tags?: CredentialTags
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface PaginatedCredentials<T = Record<string, unknown>> extends PaginatedResponse<T> {
  filters?: CredentialListQuery
}

/** Tags searched by `q` when a caller does not provide its own list. */
export const DEFAULT_CREDENTIAL_SEARCHABLE_TAGS = [
  'credentialType',
  'vct',
  'docType',
  'types',
  'name',
  'reference',
  'issuer',
]

export const DEFAULT_CREDENTIAL_PAGE = 1
export const DEFAULT_CREDENTIAL_PAGE_SIZE = 20
export const MAX_CREDENTIAL_PAGE_SIZE = 100

/** Invalid pagination input from a caller. Apps can show this message directly. */
export class InvalidCredentialListQueryError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'InvalidCredentialListQueryError'
  }
}

/** Trim a filter value, split comma-separated strings, and drop empties. */
export function normalizeCredentialFilterValue(value: CredentialFilterValue): CredentialFilterValue {
  if (value === undefined || value === null || value === '') return undefined

  if (Array.isArray(value)) {
    const cleaned = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry) => entry !== undefined && entry !== null && entry !== '')
    return cleaned.length > 0 ? cleaned : undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.includes(',')) {
      return normalizeCredentialFilterValue(trimmed.split(','))
    }
    return trimmed || undefined
  }

  return value
}

/**
 * Build the tag query passed to a credential repository. Search and pagination fields are ignored:
 * they are applied to the fetched records by {@link filterCredentialRecords}.
 */
export function buildCredentialTagQuery(filters: CredentialListQuery): Record<string, string | string[]> {
  const ignored = new Set(['q', 'page', 'pageSize', 'tags'])
  const query: Record<string, string | string[]> = {}

  for (const [key, value] of Object.entries(filters)) {
    if (ignored.has(key)) continue
    const normalized = normalizeCredentialFilterValue(value)
    if (normalized === undefined || normalized === null) continue
    if (Array.isArray(normalized)) {
      if (normalized.length > 0) query[key] = normalized.map(String)
    } else {
      query[key] = String(normalized)
    }
  }
  return query
}

function tagValue(tags: Record<string, unknown> | undefined, key: string): unknown {
  if (!tags || typeof tags !== 'object') return undefined
  if (key in tags) return tags[key]
  // Case-insensitive lookup for old records written with different casing.
  const lowerKey = key.toLowerCase()
  for (const [candidate, value] of Object.entries(tags)) {
    if (candidate.toLowerCase() === lowerKey) return value
  }
  return undefined
}

/** Record shape needed for searching and serialising credential records. */
export interface ListableCredentialRecord {
  getTags?: () => Record<string, unknown>
  tags?: Record<string, unknown>
}

/** Free-text match over the configured tags, then over a few common record fields. */
export function matchesCredentialSearch<RecordType extends ListableCredentialRecord>(
  record: RecordType,
  q: string,
  searchableTags: string[]
): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true

  const tags = record.getTags ? record.getTags() : record.tags
  if (tags && typeof tags === 'object') {
    const matchedTag = searchableTags.some((tag) => {
      const value = tagValue(tags, tag)
      const values = Array.isArray(value) ? value : [value]
      return values.some((entry) => typeof entry === 'string' && entry.toLowerCase().includes(needle))
    })
    if (matchedTag) return true
  }

  const fallbackFields = ['id', 'name', 'reference', 'issuerId', 'issuer']
  const asRecord = record as unknown as Record<string, unknown>
  for (const field of fallbackFields) {
    const value = asRecord[field]
    if (typeof value === 'string' && value.toLowerCase().includes(needle)) return true
  }

  if (asRecord.credential && typeof asRecord.credential === 'object') {
    try {
      if (JSON.stringify(asRecord.credential).toLowerCase().includes(needle)) return true
    } catch {
      // Circular references are not searchable.
    }
  }
  return false
}

function hasListParams(query: CredentialListQuery): boolean {
  return Object.values(query).some((value) => value !== undefined && value !== null && value !== '')
}

/** Validate and apply defaults to `page` / `pageSize`. */
export function normalizeCredentialPagination(query: CredentialListQuery): { page: number; pageSize: number } {
  let page = DEFAULT_CREDENTIAL_PAGE
  let pageSize = DEFAULT_CREDENTIAL_PAGE_SIZE

  if (query.page !== undefined && query.page !== null) {
    const parsed = Number(query.page)
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new InvalidCredentialListQueryError('Invalid page. page must be an integer >= 1')
    }
    page = parsed
  }

  if (query.pageSize !== undefined && query.pageSize !== null) {
    const parsed = Number(query.pageSize)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_CREDENTIAL_PAGE_SIZE) {
      throw new InvalidCredentialListQueryError(
        `Invalid pageSize. pageSize must be an integer between 1 and ${MAX_CREDENTIAL_PAGE_SIZE}`
      )
    }
    pageSize = parsed
  }

  return { page, pageSize }
}

/**
 * Search and paginate already-fetched credential records. Preserves the platform list contract:
 * no query fields returns the records as an array; any query field returns a paginated envelope.
 */
export function filterCredentialRecords<RecordType extends ListableCredentialRecord>(
  records: RecordType[],
  query: CredentialListQuery = {},
  searchableTags: string[] = []
): RecordType[] | PaginatedCredentials<Record<string, unknown>> {
  const filtered = query.q
    ? records.filter((record) => matchesCredentialSearch(record, query.q as string, searchableTags))
    : records

  if (!hasListParams(query)) return filtered

  const { page, pageSize } = normalizeCredentialPagination(query)
  const total = filtered.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize).map((record) => {
    const serialized = JsonTransformer.toJSON(record)
    const recordTags = record.getTags ? record.getTags() : serialized.tags
    return { ...serialized, tags: recordTags }
  })

  const filters: CredentialListQuery = {}
  if (query.q) filters.q = query.q.trim()
  if (query.credentialType !== undefined) filters.credentialType = query.credentialType
  if (query.vct !== undefined) filters.vct = query.vct
  if (query.docType !== undefined) filters.docType = query.docType
  if (query.types !== undefined) filters.types = query.types
  if (query.issuer !== undefined) filters.issuer = query.issuer
  if (query.name !== undefined) filters.name = query.name
  if (query.reference !== undefined) filters.reference = query.reference

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  }
}

/** Drop empty and non-string tag values before writing them to a credential record. */
export function sanitizeCredentialTags(tags?: CredentialTags): CredentialTags | undefined {
  if (!tags || typeof tags !== 'object') return undefined

  const sanitized: CredentialTags = {}
  for (const [key, value] of Object.entries(tags)) {
    if (Array.isArray(value)) {
      const cleaned = value
        .filter((entry) => typeof entry === 'string' && entry.trim() !== '')
        .map((entry) => entry.trim())
      if (cleaned.length > 0) sanitized[key] = cleaned
    } else if (typeof value === 'string' && value.trim() !== '') {
      sanitized[key] = value.trim()
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}
