import assert from 'node:assert/strict'
import test from 'node:test'

import { Kms } from '@credo-ts/core'
import {
  assertOfferAcceptsHolderDid,
  getCredentialBindingResolver,
  HolderBindingNotSupportedError,
} from '../build/credentialBindingResolver.mjs'

const WALLET_DID = 'did:web:wallet.example.com'
const WALLET_KEY = `${WALLET_DID}#key-1`

// RFC 8037 Ed25519 public key, used so Credo can derive the supported JWA algorithms.
const holderPublicJwk = Kms.PublicJwk.fromUnknown({
  kty: 'OKP',
  crv: 'Ed25519',
  x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
})

const verificationMethod = {
  id: '#key-1',
  type: 'Ed25519VerificationKey2020',
  publicKeyMultibase: holderPublicJwk.fingerprint,
}

function createAgentContext({ did = WALLET_DID } = {}) {
  const didDocument = {
    authentication: ['#key-1'],
    dereferenceKey: (keyId) => {
      if (keyId !== verificationMethod.id && keyId !== `${did}${verificationMethod.id}`) {
        throw new Error(`Verification method '${keyId}' not found`)
      }
      return verificationMethod
    },
  }

  return {
    resolve: () => ({
      resolveCreatedDidDocumentWithKeys: async (requestedDid) => {
        if (requestedDid !== did) throw new Error(`Created did '${requestedDid}' not found`)
        return { didDocument, keys: [] }
      },
    }),
    config: { logger: { warn: () => {} } },
  }
}

function bindingOptions(overrides = {}) {
  return {
    agentContext: createAgentContext(),
    credentialFormat: 'jwt_vc_json',
    issuerMaxBatchSize: 1,
    proofTypes: {
      jwt: { supportedSignatureAlgorithms: ['EdDSA'], keyAttestationsRequired: false },
    },
    credentialConfigurationId: 'identity',
    credentialConfiguration: { format: 'jwt_vc_json' },
    supportsAllDidMethods: false,
    supportedDidMethods: ['did:web'],
    supportsJwk: false,
    metadata: {},
    cNonce: 'c-nonce',
    ...overrides,
  }
}

const offerWith = (configuration) => ({
  offeredCredentialConfigurations: { identity: configuration },
})

test('getCredentialBindingResolver binds a verification method id to the holder DID', async () => {
  const resolver = getCredentialBindingResolver({ holderDidUrl: WALLET_KEY })
  const binding = await resolver(bindingOptions())

  assert.deepEqual(binding, { method: 'did', didUrls: [WALLET_KEY] })
})

test('getCredentialBindingResolver resolves a bare DID to its first authentication key', async () => {
  const resolver = getCredentialBindingResolver({ holderDidUrl: WALLET_DID })
  const binding = await resolver(bindingOptions())

  assert.deepEqual(binding, { method: 'did', didUrls: [WALLET_KEY] })
})

test('getCredentialBindingResolver requires an existing holder DID', async () => {
  const resolver = getCredentialBindingResolver({ holderDidUrl: 'did:web:missing.example.com' })

  await assert.rejects(resolver(bindingOptions()), /was not created in this wallet/)
})

test('getCredentialBindingResolver rejects DIDs for mso_mdoc before creating a new key', async () => {
  const resolver = getCredentialBindingResolver({ holderDidUrl: WALLET_KEY })

  await assert.rejects(
    resolver(
      bindingOptions({
        credentialFormat: 'mso_mdoc',
        credentialConfiguration: { format: 'mso_mdoc' },
        supportedDidMethods: undefined,
        supportsAllDidMethods: true,
      })
    ),
    (error) => error instanceof HolderBindingNotSupportedError && /mso_mdoc/.test(error.message)
  )
})

test('getCredentialBindingResolver rejects an unsupported DID method', async () => {
  const resolver = getCredentialBindingResolver({ holderDidUrl: WALLET_KEY })

  await assert.rejects(
    resolver(bindingOptions({ supportedDidMethods: ['did:key'] })),
    (error) => error instanceof HolderBindingNotSupportedError && /did:web/.test(error.message)
  )
})

test('assertOfferAcceptsHolderDid accepts an offer without binding restrictions', async () => {
  await assert.doesNotReject(
    assertOfferAcceptsHolderDid(createAgentContext(), offerWith({ format: 'jwt_vc_json' }), ['identity'], {
      holderDidUrl: WALLET_KEY,
    })
  )
})

test('assertOfferAcceptsHolderDid rejects offers for unsupported formats', async () => {
  await assert.rejects(
    assertOfferAcceptsHolderDid(createAgentContext(), offerWith({ format: 'mso_mdoc' }), ['identity'], {
      holderDidUrl: WALLET_KEY,
    }),
    (error) => error instanceof HolderBindingNotSupportedError && /^identity: /.test(error.message)
  )
})

test('assertOfferAcceptsHolderDid skips issuer checks with the prefer policy', async () => {
  await assert.doesNotReject(
    assertOfferAcceptsHolderDid(createAgentContext(), offerWith({ format: 'mso_mdoc' }), ['identity'], {
      holderDidUrl: WALLET_KEY,
      bindingPolicy: 'prefer',
    })
  )
})
