import assert from 'node:assert/strict'
import test from 'node:test'

import { ClaimFormat } from '@credo-ts/core'
import { getSelectedCredentialsForRequest } from '../build/display/proof.mjs'
import { extractCredentialPlaceholderFromQueryCredential } from '../build/resolverProof.mjs'

test('extractCredentialPlaceholderFromQueryCredential keeps jwt_vc_json as JwtVc', () => {
  const placeholder = extractCredentialPlaceholderFromQueryCredential({
    id: 'identity',
    format: 'jwt_vc_json',
    claims: [{ path: ['credentialSubject', 'name'] }],
  })

  assert.equal(placeholder.claimFormat, ClaimFormat.JwtVc)
  assert.deepEqual(placeholder.requestedAttributePaths, [['credentialSubject', 'name']])
})

test('extractCredentialPlaceholderFromQueryCredential maps ldp_vc to LdpVc', () => {
  const placeholder = extractCredentialPlaceholderFromQueryCredential({
    id: 'identity',
    format: 'ldp_vc',
    meta: {
      type_values: [
        ['https://www.w3.org/2018/credentials#VerifiableCredential', 'https://example.com/IdentityCredential'],
      ],
    },
    claims: [{ path: ['credentialSubject', 'name'] }],
  })

  assert.equal(placeholder.claimFormat, ClaimFormat.LdpVc)
  assert.equal(placeholder.credentialName, 'example.com/IdentityCredential')
  assert.deepEqual(placeholder.requestedAttributePaths, [['credentialSubject', 'name']])
})

test('getSelectedCredentialsForRequest uses the W3C record claim format', () => {
  const ldpVcRecord = {
    id: 'ldp-record',
    type: 'W3cCredentialRecord',
    firstCredential: { claimFormat: ClaimFormat.LdpVc },
  }
  const jwtVcRecord = {
    id: 'jwt-record',
    type: 'W3cCredentialRecord',
    firstCredential: { claimFormat: ClaimFormat.JwtVc },
  }

  const queryResult = {
    can_be_satisfied: true,
    credential_matches: {
      ldp_query: {
        success: true,
        valid_credentials: [
          {
            record: ldpVcRecord,
            claims: { valid_claim_sets: [{ output: { name: 'LDP holder' } }] },
          },
        ],
      },
      jwt_query: {
        success: true,
        valid_credentials: [
          {
            record: jwtVcRecord,
            claims: { valid_claim_sets: [{ output: { name: 'JWT holder' } }] },
          },
        ],
      },
    },
  }

  const selected = getSelectedCredentialsForRequest(queryResult, {
    ldp_query: 'ldp-record',
    jwt_query: 'jwt-record',
  })

  assert.equal(selected.ldp_query[0].claimFormat, ClaimFormat.LdpVc)
  assert.equal(selected.ldp_query[0].credentialRecord, ldpVcRecord)
  assert.equal(selected.jwt_query[0].claimFormat, ClaimFormat.JwtVc)
  assert.equal(selected.jwt_query[0].credentialRecord, jwtVcRecord)
})
