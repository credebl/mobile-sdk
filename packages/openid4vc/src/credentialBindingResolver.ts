import {
  DidJwk,
  DidKey,
  DidsApi,
  type JwkDidCreateOptions,
  KeyBackend,
  type KeyDidCreateOptions,
  getJwkFromKey,
} from '@credo-ts/core'
import {
  type OpenId4VcCredentialHolderBinding,
  OpenId4VcCredentialHolderDidBinding,
  type OpenId4VciCredentialBindingResolver,
  OpenId4VciCredentialFormatProfile,
} from '@credo-ts/openid4vc'

export function getCredentialBindingResolver(
  pidSchemes: { sdJwtVcVcts: Array<string>; msoMdocDoctypes: Array<string> } | undefined,
  requestBatch: boolean | number = 1
): OpenId4VciCredentialBindingResolver {
  return async ({
    supportedDidMethods,
    keyTypes,
    supportsAllDidMethods,
    supportsJwk,
    credentialFormat,
    agentContext,
  }): Promise<OpenId4VcCredentialHolderBinding> => {
    let didMethod: 'key' | 'jwk' | undefined =
      supportsAllDidMethods || supportedDidMethods?.includes('did:jwk')
        ? 'jwk'
        : supportedDidMethods?.includes('did:key')
          ? 'key'
          : undefined

    if (!supportedDidMethods && !supportsJwk) {
      didMethod = 'key'
    }

    const shouldKeyBeHardwareBackedForMsoMdoc =
      credentialFormat === OpenId4VciCredentialFormatProfile.MsoMdoc && pidSchemes
    const shouldKeyBeHardwareBackedForSdJwtVc =
      credentialFormat === OpenId4VciCredentialFormatProfile.SdJwtVc && pidSchemes

    const shouldKeyBeHardwareBacked = shouldKeyBeHardwareBackedForSdJwtVc || shouldKeyBeHardwareBackedForMsoMdoc

    const keyType = keyTypes[0]

    const batchSize = typeof requestBatch === 'boolean' ? (requestBatch ? 1 : 0) : requestBatch

    const keys = await Promise.all(
      Array(batchSize)
        .fill(0)
        .map(() =>
          agentContext.wallet.createKey({
            keyType,
            keyBackend: shouldKeyBeHardwareBacked ? KeyBackend.SecureElement : KeyBackend.Software,
          })
        )
    )

    if (didMethod) {
      const dm = didMethod
      const didsApi = agentContext.dependencyManager.resolve(DidsApi)
      const didResults = await Promise.all(
        keys.map(async (key) => {
          const didResult = await didsApi.create<JwkDidCreateOptions | KeyDidCreateOptions>({
            method: dm,
            options: {
              key,
            },
          })

          if (didResult.didState.state !== 'finished') {
            throw new Error('DID creation failed.')
          }

          let verificationMethodId: string
          if (didMethod === 'jwk') {
            const didJwk = DidJwk.fromDid(didResult.didState.did)
            verificationMethodId = didJwk.verificationMethodId
          } else {
            const didKey = DidKey.fromDid(didResult.didState.did)
            verificationMethodId = `${didKey.did}#${didKey.key.fingerprint}`
          }

          return {
            didUrl: verificationMethodId,
            method: 'did',
          } as unknown as OpenId4VcCredentialHolderDidBinding
        })
      )
      return didResults[0]
    }

    if (
      supportsJwk &&
      (credentialFormat === OpenId4VciCredentialFormatProfile.SdJwtVc ||
        credentialFormat === OpenId4VciCredentialFormatProfile.MsoMdoc)
    ) {
      return {
        method: 'jwk',
        // @ts-ignore
        keys: keys.map((key) => getJwkFromKey(key)),
      }
    }

    throw new Error(
      `No supported binding method could be found. Supported methods are did:key and did:jwk, or plain jwk for sd-jwt/mdoc. Issuer supports ${supportsJwk ? 'jwk, ' : ''
      }${supportedDidMethods?.join(', ') ?? 'Unknown'}`
    )
  }
}