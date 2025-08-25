import type { MobileSDKModule } from '@credebl/ssi-mobile-core'
import {
  type Agent,
  JwaSignatureAlgorithm,
  MdocRecord,
  MdocRepository,
  SdJwtVcRecord,
  SdJwtVcRepository,
  W3cCredentialRecord,
  W3cCredentialRepository,
  X509Module,
  type X509ModuleConfigOptions,
} from '@credo-ts/core'
import {
  OpenId4VcHolderModule,
  type OpenId4VciCredentialConfigurationSupportedWithFormats,
  type OpenId4VciRequestTokenResponse,
  type OpenId4VciResolvedAuthorizationRequest,
  type OpenId4VciResolvedCredentialOffer,
  getOfferedCredentials,
  getScopesFromCredentialConfigurationsSupported,
  preAuthorizedCodeGrantIdentifier,
} from '@credo-ts/openid4vc'
import { getCredentialBindingResolver } from './credentialBindingResolver'
import {
  extractOpenId4VcCredentialMetadata,
  setBatchCredentialMetadata,
  setOpenId4VcCredentialMetadata,
} from './metadata'
import { credentialRecordFromCredential, encodeCredential } from './utils'

export type OpenId4VcConfiguration = {} & X509ModuleConfigOptions

export const getOpenid4VcModules = (configuration: OpenId4VcConfiguration) =>
  ({
    openId4VcHolder: new OpenId4VcHolderModule(),
    x509: new X509Module({
      trustedCertificates: configuration?.trustedCertificates,
      getTrustedCertificatesForVerification: configuration?.getTrustedCertificatesForVerification,
    }),
  }) as const

export type OpenId4VcAgent = Agent<ReturnType<typeof getOpenid4VcModules>>

export class OpenID4VCSDK implements MobileSDKModule {
  private agent?: OpenId4VcAgent
  private configuration: OpenId4VcConfiguration

  public constructor(configuration: OpenId4VcConfiguration) {
    this.configuration = configuration
  }

  private assertAndGetAgent(): OpenId4VcAgent {
    if (!this.agent) {
      throw new Error('Agent not initialized')
    }

    return this.agent
  }

  public initialize(agent: OpenId4VcAgent): void {
    this.agent = agent
  }

  public getAgentModules() {
    return getOpenid4VcModules(this.configuration)
  }

  public async resolveOpenId4VciOffer({
    offer,
    authorization,
    customHeaders,
    fetchAuthorization = true,
  }: {
    offer: { uri: string }
    authorization?: { clientId: string; redirectUri: string }
    customHeaders?: Record<string, unknown>
    fetchAuthorization?: boolean
  }) {
    const agent = this.assertAndGetAgent()

    agent.config.logger.info(`Receiving openid uri ${offer.uri}`, {
      uri: offer.uri,
    })

    const resolvedCredentialOffer = await agent.modules.openId4VcHolder.resolveCredentialOffer(offer.uri)
    let resolvedAuthorizationRequest: OpenId4VciResolvedAuthorizationRequest | undefined = undefined

    // NOTE: we always assume scopes are used at the moment
    if (fetchAuthorization && resolvedCredentialOffer.credentialOfferPayload.grants?.authorization_code) {
      // If only authorization_code grant is valid and user didn't provide authorization details we can't continue
      if (!resolvedCredentialOffer.credentialOfferPayload.grants[preAuthorizedCodeGrantIdentifier] && !authorization) {
        throw new Error(
          "Missing 'authorization' parameter with 'clientId' and 'redirectUri' and authorization code flow is only allowed grant type on offer."
        )
      }

      // TODO: authorization should only be initiated after we know which credentials we're going to request
      if (authorization) {
        resolvedAuthorizationRequest = await agent.modules.openId4VcHolder.resolveOpenId4VciAuthorizationRequest(
          resolvedCredentialOffer,
          {
            redirectUri: authorization.redirectUri,
            clientId: authorization.clientId,
            scope: getScopesFromCredentialConfigurationsSupported(
              resolvedCredentialOffer.offeredCredentialConfigurations
            ),
            // Added in patch but not in types
            // @ts-ignore
            customHeaders,
          }
        )
      }
    }

    return {
      resolvedCredentialOffer,
      resolvedAuthorizationRequest,
    }
  }

  public async acquirePreAuthorizedAccessToken({
    resolvedCredentialOffer,
    txCode,
  }: {
    resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
    txCode?: string
  }) {
    const agent = this.assertAndGetAgent()
    return await agent.modules.openId4VcHolder.requestToken({
      resolvedCredentialOffer,
      txCode,
    })
  }

  public async receiveCredentialFromOpenId4VciOffer({
    resolvedCredentialOffer,
    credentialConfigurationIdsToRequest,
    accessToken,
    clientId,
    pidSchemes,
    requestBatch,
  }: {
    resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
    credentialConfigurationIdsToRequest?: string[]
    clientId?: string
    pidSchemes?: { sdJwtVcVcts: Array<string>; msoMdocDoctypes: Array<string> }
    requestBatch?: boolean | number

    // TODO: cNonce should maybe be provided separately (multiple calls can have different c_nonce values)
    accessToken: OpenId4VciRequestTokenResponse
  }): Promise<
    Array<{
      credentialConfigurationId: string
      configuration: OpenId4VciCredentialConfigurationSupportedWithFormats
      credential: SdJwtVcRecord | MdocRecord | W3cCredentialRecord
    }>
  > {
    const agent = this.assertAndGetAgent()
    const offeredCredentialsToRequest = getOfferedCredentials(
      credentialConfigurationIdsToRequest ?? [
        resolvedCredentialOffer.credentialOfferPayload.credential_configuration_ids[0],
      ],
      resolvedCredentialOffer.offeredCredentialConfigurations
    ) as OpenId4VciCredentialConfigurationSupportedWithFormats

    if (Object.keys(offeredCredentialsToRequest).length === 0) {
      throw new Error(
        `Parameter 'credentialConfigurationIdsToRequest' with values ${credentialConfigurationIdsToRequest} is not a credential_configuration_id in the credential offer.`
      )
    }

    const credentials = await agent.modules.openId4VcHolder.requestCredentials({
      resolvedCredentialOffer,
      ...accessToken,
      clientId,
      credentialConfigurationIds: Object.keys(offeredCredentialsToRequest),
      verifyCredentialStatus: false,
      allowedProofOfPossessionSignatureAlgorithms: [JwaSignatureAlgorithm.ES256, JwaSignatureAlgorithm.EdDSA],
      credentialBindingResolver: getCredentialBindingResolver(requestBatch),
    })

    return credentials.credentials.map(({ credentials, ...credentialResponse }) => {
      const configuration = resolvedCredentialOffer.offeredCredentialConfigurations[
        credentialResponse.credentialConfigurationId
      ] as OpenId4VciCredentialConfigurationSupportedWithFormats

      const firstCredential = credentials[0]

      const record = credentialRecordFromCredential(firstCredential)

      // OpenID4VC metadata
      const openId4VcMetadata = extractOpenId4VcCredentialMetadata(configuration, {
        id: resolvedCredentialOffer.metadata.credentialIssuer.credential_issuer,
        display: resolvedCredentialOffer.metadata.credentialIssuer.display,
      })
      setOpenId4VcCredentialMetadata(record, openId4VcMetadata)

      // Batch metadata
      if (credentials.length > 1) {
        setBatchCredentialMetadata(record, {
          additionalCredentials: credentials.slice(1).map(encodeCredential) as
            | Array<string>
            | Array<Record<string, unknown>>,
        })
      }

      return {
        ...credentialResponse,
        configuration,
        credential: record,
      }
    })
  }

  public async storeOpenIdCredential(cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord): Promise<void> {
    const agent = this.assertAndGetAgent()
    if (cred instanceof W3cCredentialRecord) {
      await agent.dependencyManager.resolve(W3cCredentialRepository).save(agent.context, cred)
    } else if (cred instanceof SdJwtVcRecord) {
      await agent.dependencyManager.resolve(SdJwtVcRepository).save(agent.context, cred)
    } else if (cred instanceof MdocRecord) {
      await agent.dependencyManager.resolve(MdocRepository).save(agent.context, cred)
    } else {
      throw new Error('Credential type is not supported')
    }
  }

  public async acquireAuthorizationCodeAccessToken({
    resolvedCredentialOffer,
    codeVerifier,
    authorizationCode,
    clientId,
    redirectUri,
  }: {
    resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
    codeVerifier?: string
    authorizationCode: string
    clientId: string
    redirectUri?: string
  }) {
    const agent = this.assertAndGetAgent()
    const response = await agent.modules.openId4VcHolder.requestToken({
      resolvedCredentialOffer,
      code: authorizationCode,
      codeVerifier,
      redirectUri,
      clientId,
    })
    return response
  }
}
