---
'@credebl/ssi-mobile-core': minor
---

Add filtered and paginated credential listing.

`MobileSDK.getCredentials({ query?, format?, searchableTags? })` lists stored credentials using platform-style tag
filters (`credentialType`, `vct`, `docType`, `types`, `issuer`, `name`, `reference`), a custom `tags` object and
free-text search. With no query fields it returns a plain array; with any query field it returns a
`{ data, pagination, filters? }` envelope. Invalid pagination throws `InvalidCredentialListQueryError`.

The underlying helpers (`buildCredentialTagQuery`, `filterCredentialRecords`, `normalizeCredentialPagination`,
`sanitizeCredentialTags`, `matchesCredentialSearch`, `normalizeCredentialFilterValue`) and their types are exported
for apps that fetch records themselves.
