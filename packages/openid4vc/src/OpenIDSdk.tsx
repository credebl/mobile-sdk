import { DeviceRequest, limitDisclosureToDeviceRequestNameSpaces, parseIssuerSigned } from '@animo-id/mdoc'
import type { MobileSDKModule } from '@credebl/ssi-mobile-core'
import {
  type Agent,
  type DifPresentationExchangeDefinitionV2,
  Kms,
  MdocRecord,
  MdocRepository,
  type SdJwtVcPayload,
  SdJwtVcRecord,
  SdJwtVcRepository,
  type SdJwtVcSignOptions,
  TypedArrayEncoder,
  W3cCredentialRecord,
  W3cCredentialRepository,
  X509Module,
  type X509ModuleConfigOptions,
} from '@credo-ts/core'
import {
  OpenId4VcHolderModule,
  OpenId4VcModule,
  type OpenId4VciCredentialConfigurationSupportedWithFormats,
  OpenId4VciCredentialResponse,
  OpenId4VciMetadata,
  type OpenId4VciRequestTokenResponse,
  type OpenId4VciResolvedAuthorizationRequest,
  type OpenId4VciResolvedCredentialOffer,
  getOfferedCredentials,
  getScopesFromCredentialConfigurationsSupported,
  preAuthorizedCodeGrantIdentifier,
} from '@credo-ts/openid4vc'
import type { PropsWithChildren } from 'react'
import { getCredentialBindingResolver } from './credentialBindingResolver'
import {
  type FormattedSubmission,
  type FormattedSubmissionEntry,
  type FormattedSubmissionEntrySatisfiedCredential,
  getAttributesAndMetadataForMdocPayload,
  getCredentialForDisplay,
  getSelectedCredentialsForRequest,
} from './display'
import {
  extractOpenId4VcCredentialMetadata,
  setBatchCredentialMetadata,
  setOpenId4VcCredentialMetadata,
} from './metadata'
import { MdocRecordProvider, SdJwtVcRecordProvider } from './providers'
import {
  type GetCredentialsForProofRequestOptions,
  formatDcqlCredentialsForRequest,
  formatDifPexCredentialsForRequest,
} from './resolverProof'
import { applySelectedCredentialFilter, credentialRecordFromCredential, encodeCredential, ensureSingleCredentialRequest, extractProviderRequest, getHostNameFromUrl } from './utils'
import { DigitalCredentialsRequest, registerCredentials, sendResponse } from '@animo-id/expo-digital-credentials-api'
import { CredentialItem, loadCachedImageAsBase64DataUrl, mapMdocAttributes, mapMdocAttributesToClaimDisplay, mapSdJwtAttributesToClaimDisplay } from './dcapi/mapAttributes'
import { Platform } from 'react-native'
import { BiometricAuthenticationError } from './utils/error'

export { extractCredentialPlaceholderFromQueryCredential } from '../src/resolverProof'

export type CredentialsForProofRequest = Awaited<ReturnType<OpenID4VCSDK['getCredentialsForProofRequest']>>

export type OpenId4VcConfiguration = {} & X509ModuleConfigOptions

export const getOpenid4VcModules = (configuration: OpenId4VcConfiguration) =>
  ({
    openid4vc: new OpenId4VcModule({}),
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

  public static OpenIDProvider({ agent, children }: PropsWithChildren<{ agent: Agent }>) {
    return (
      <SdJwtVcRecordProvider agent={agent}>
        <MdocRecordProvider agent={agent}>{children}</MdocRecordProvider>
      </SdJwtVcRecordProvider>
    )
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

    const resolvedCredentialOffer = await agent.modules.openid4vc.holder.resolveCredentialOffer(offer.uri)
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
        resolvedAuthorizationRequest = await agent.modules.openid4vc.holder.resolveOpenId4VciAuthorizationRequest(
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
    return await agent.modules.openid4vc.holder.requestToken({
      resolvedCredentialOffer,
      txCode,
    })
  }

  async parseCredentialResponses(credentials: OpenId4VciCredentialResponse[], issuerMetadata: OpenId4VciMetadata) {
    return credentials.map(({ record, ...credentialResponse }) => {
      // OpenID4VC metadata
      const openId4VcMetadata = extractOpenId4VcCredentialMetadata(credentialResponse.credentialConfiguration, {
        id: issuerMetadata.credentialIssuer.credential_issuer,
        display: issuerMetadata.credentialIssuer.display,
      })
      setOpenId4VcCredentialMetadata(record, openId4VcMetadata)

      return {
        ...credentialResponse,
        credential: record,
      }
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
  }) {
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

    try {
    const { credentials, deferredCredentials } = await agent.openid4vc.holder.requestCredentials({
      resolvedCredentialOffer,
      ...accessToken,
      clientId,
      credentialConfigurationIds: Object.keys(offeredCredentialsToRequest),
      verifyCredentialStatus: false,
      allowedProofOfPossessionSignatureAlgorithms: [
        Kms.KnownJwaSignatureAlgorithms.ES256,
        Kms.KnownJwaSignatureAlgorithms.EdDSA,
      ],
      credentialBindingResolver: getCredentialBindingResolver({
        pidSchemes,
        requestBatch,
      }),
    })

    return {
      deferredCredentials,
      credentials: await this.parseCredentialResponses(credentials, resolvedCredentialOffer.metadata),
    }
  } catch (error) {
    // TODO: if one biometric operation fails it will fail the whole credential receiving. We should have more control so we
    // can retry e.g. the second credential
    // Handle biometric authentication errors
    throw BiometricAuthenticationError.tryParseFromError(error) ?? error
  }
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
    this.registerCredentialsForDcApi()
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
    const response = await agent.modules.openid4vc.holder.requestToken({
      resolvedCredentialOffer,
      code: authorizationCode,
      codeVerifier,
      redirectUri,
      clientId,
    })
    return response
  }

  // Proofs
  public async getCredentialsForProofRequest({
    uri,
    requestPayload,
    allowUntrustedFederation = true,
    origin,
    trustedX509Entities,
    preferredLocale,
    selectedCredentialsId
  }: GetCredentialsForProofRequestOptions) {
    const agent = this.assertAndGetAgent()

    let request: string | Record<string, unknown>
    if (uri) {
      request = uri
    } else if (requestPayload) {
      request = requestPayload
    } else {
      throw new Error('Either requestPayload or uri must be provided')
    }

    agent.config.logger.info('Receiving openid request', {
      request,
    })

    const resolved = await agent.modules.openid4vc.holder.resolveOpenId4VpAuthorizationRequest(request, {
      origin,
      selectedCredentialsId,
    })

    const { authorizationRequestPayload } = resolved
    const clientMetadata = authorizationRequestPayload.client_metadata
    const verifier = {
      entity_id: authorizationRequestPayload.client_id ?? `web-origin:${origin}`,
      uri:
        typeof authorizationRequestPayload.response_uri === 'string'
          ? new URL(authorizationRequestPayload.response_uri).origin
          : undefined,
      logo_uri: clientMetadata?.logo_uri,
      organization_name: clientMetadata?.client_name,
    }
    let formattedSubmission: FormattedSubmission
    if (resolved.presentationExchange) {
      formattedSubmission = formatDifPexCredentialsForRequest(
        resolved.presentationExchange.credentialsForRequest,
        resolved.presentationExchange.definition as DifPresentationExchangeDefinitionV2,
        preferredLocale
      )
    } else if (resolved.dcql) {
      formattedSubmission = formatDcqlCredentialsForRequest(resolved.dcql.queryResult)
    } else {
      throw new Error('No presentation exchange or dcql found in authorization request.')
    }

    return {
      ...resolved.presentationExchange,
      ...resolved.dcql,
      origin,
      verifier: {
        hostName: verifier.uri,
        entityId: verifier.entity_id,
        logo: verifier.logo_uri
          ? {
              url: verifier.logo_uri,
            }
          : undefined,
        name: verifier.organization_name,
      },
      authorizationRequest: resolved.authorizationRequestPayload,
      formattedSubmission,
      transactionData: resolved.transactionData,
    } as const
  }

  public async shareProof({
    resolvedRequest,
    selectedCredentials,
    acceptTransactionData,
  }: {
    resolvedRequest: CredentialsForProofRequest
    selectedCredentials: { [inputDescriptorId: string]: string }
    acceptTransactionData?: boolean
  }) {
    const agent = this.assertAndGetAgent()
    const { authorizationRequest } = resolvedRequest
    if (
      !resolvedRequest.credentialsForRequest?.areRequirementsSatisfied &&
      !resolvedRequest.queryResult?.can_be_satisfied
    ) {
      throw new Error('Requirements from proof request are not satisfied')
    }
    const presentationExchangeCredentials = resolvedRequest.credentialsForRequest
      ? Object.fromEntries(
          await Promise.all(
            resolvedRequest.credentialsForRequest.requirements.flatMap((requirement) =>
              requirement.submissionEntry.slice(0, requirement.needsCount).map(async (entry) => {
                const credentialId = selectedCredentials[entry.inputDescriptorId]
                const credential =
                  entry.verifiableCredentials.find((vc) => vc.credentialRecord.id === credentialId) ??
                  entry.verifiableCredentials[0]

                return [entry.inputDescriptorId, [credential]]
              })
            )
          )
        )
      : undefined

    const dcqlCredentials = resolvedRequest.queryResult
      ? Object.fromEntries(
          await Promise.all(
            Object.entries(
              Object.keys(selectedCredentials).length > 0
                ? getSelectedCredentialsForRequest(resolvedRequest.queryResult, selectedCredentials)
                : agent.modules.openid4vc.holder.selectCredentialsForDcqlRequest(resolvedRequest.queryResult)
            ).map(async ([queryCredentialId, credentials]) => {
              return [queryCredentialId, credentials]
            })
          )
        )
      : undefined

    const result = await agent.modules.openid4vc.holder.acceptOpenId4VpAuthorizationRequest({
      authorizationRequestPayload: authorizationRequest,
      presentationExchange: presentationExchangeCredentials
        ? {
            credentials: presentationExchangeCredentials,
          }
        : undefined,
      dcql: dcqlCredentials
        ? {
            credentials: dcqlCredentials,
          }
        : undefined,
      transactionData: undefined,
      origin: resolvedRequest.origin,
    })

    if (result.serverResponse && (result.serverResponse.status < 200 || result.serverResponse.status > 299)) {
      agent.config.logger.error('Error while accepting authorization request', {
        authorizationRequest,
        response: result.authorizationResponse,
        responsePayload: result.authorizationResponsePayload,
      })
      throw new Error(
        `Error while accepting authorization request. ${JSON.stringify(result.serverResponse.body, null, 2)}`
      )
    }

    return result
  }

  public async getSubmissionForMdocDocumentRequest(encodedDeviceRequest: Uint8Array) {
    const agent = this.assertAndGetAgent()

    const deviceRequest = DeviceRequest.parse(encodedDeviceRequest)

    const matchingDocTypeRecords = await agent.mdoc.findAllByQuery({
      $or: deviceRequest.docRequests.map((request) => ({
        docType: request.itemsRequest.data.docType,
      })),
    })

    const mdocs = matchingDocTypeRecords.map((record) => ({
      credential: getCredentialForDisplay(record),
      mdoc: record.firstCredential,
      issuerSignedDocument: parseIssuerSigned(
        TypedArrayEncoder.fromBase64(record.firstCredential.base64Url),
        record.firstCredential.docType
      ),
    }))

    const entries: FormattedSubmissionEntry[] = deviceRequest.docRequests.map(
      (docRequest): FormattedSubmissionEntry => {
        const matchingMdocs = mdocs
          .map((mdoc) => {
            if (mdoc.mdoc.docType !== docRequest.itemsRequest.data.docType) return undefined

            try {
              const disclosedNamespaces = limitDisclosureToDeviceRequestNameSpaces(
                mdoc.issuerSignedDocument,
                docRequest.itemsRequest.data.nameSpaces
              )

              return {
                ...mdoc,
                disclosedNameSpaces: disclosedNamespaces,
              }
            } catch (error) {
              return undefined
            }
          })
          .filter((m): m is NonNullable<typeof m> => m !== undefined)

        if (matchingMdocs.length === 0) {
          const requestedAttributePaths = Array.from(docRequest.itemsRequest.data.nameSpaces.values()).flatMap(
            (value) => Array.from(value.keys()).map((key) => [key])
          )

          return {
            inputDescriptorId: docRequest.itemsRequest.data.docType,
            isSatisfied: false,
            name: docRequest.itemsRequest.data.docType,
            requestedAttributePaths,
          }
        }

        return {
          // input descriptor id is doctype
          inputDescriptorId: docRequest.itemsRequest.data.docType,
          isSatisfied: true,
          credentials: matchingMdocs.map((matchingMdoc): FormattedSubmissionEntrySatisfiedCredential => {
            const disclosedAttributePaths = Array.from(matchingMdoc.disclosedNameSpaces.entries()).flatMap(
              ([namespace, value]) =>
                Array.from(value.values()).map((issuerSignedItem) => [namespace, issuerSignedItem.elementIdentifier])
            )

            const disclosedNamespaces = Object.fromEntries(
              Array.from(matchingMdoc.disclosedNameSpaces.entries()).map(([namespace, value]) => [
                namespace,
                Object.fromEntries(
                  Array.from(value.values()).map((issuerSignedItem) => [
                    issuerSignedItem.elementIdentifier,
                    // TODO: what is element value here?
                    issuerSignedItem.elementValue,
                  ])
                ),
              ])
            )
            const { attributes, metadata } = getAttributesAndMetadataForMdocPayload(
              disclosedNamespaces,
              matchingMdoc.mdoc
            )

            return {
              credential: matchingMdoc.credential,
              disclosed: {
                attributes,
                metadata,
                paths: disclosedAttributePaths,
              },
            }
          }) as [FormattedSubmissionEntrySatisfiedCredential, ...FormattedSubmissionEntrySatisfiedCredential[]],
        }
      }
    )

    return {
      areAllSatisfied: entries.every((entry) => entry.isSatisfied),
      entries,
    }
  }

  public async signAndStoreCredential({
    format,
    payload,
  }: {
    format: 'sd-jwt'
    payload: SdJwtVcSignOptions<SdJwtVcPayload>
  }) {
    const agent = this.assertAndGetAgent()

    if (format === 'sd-jwt') {
      const credential = await agent.sdJwtVc.sign(payload)
      const record = await agent.sdJwtVc.store({ record: SdJwtVcRecord.fromSdJwtVc(credential) })
      return record
    }

    throw new Error(`Unsupported format ${format}`)
  }

  // DCAPI

  public async resolveRequestForDcApi(args: {
    request: DigitalCredentialsRequest
  }) {
    const agent = this.assertAndGetAgent()
    const { request } = args
  
    // Determine the raw provider request payload
    const providerRequest = extractProviderRequest(request)
  
    // Parse into authorization payload
    const authorizationPayload =
      typeof providerRequest === 'string'
        ? JSON.parse(providerRequest)
        : providerRequest
  
    // Fetch credentials matching the authorization request
    const result = await this.getCredentialsForProofRequest({
      requestPayload: authorizationPayload,
      origin: request.origin,
    })
  
    ensureSingleCredentialRequest(result)
  
    agent.config.logger.debug('Resolved Digital Credentials API request', {
      result,
    })
  
    // Filter down to only the selected credential
    applySelectedCredentialFilter(result, request.selectedEntry.credentialId)
  
    return {
      ...result,
      verifier: {
        ...result.verifier,
        hostName: getHostNameFromUrl(request.origin),
      },
    }
  }
  
  public async sendResponseForDcApi(args: {
    resolvedRequest: CredentialsForProofRequest
    dcRequest: DigitalCredentialsRequest
  }) {
    const agent = this.assertAndGetAgent()
    const { resolvedRequest, dcRequest } = args
  
    const entry = resolvedRequest.formattedSubmission.entries[0]
  
    if (!entry?.isSatisfied) {
      agent.config.logger.debug('Invalid DC API response state', {
        resolvedRequest,
        dcRequest,
      })
      throw new Error('Expected the Digital Credentials API request to be satisfied')
    }
  
    const result = await this.shareProof({
      resolvedRequest,
      selectedCredentials: {
        [entry.inputDescriptorId]: dcRequest.selectedEntry.credentialId,
      },
    })
  
    agent.config.logger.debug('Sending Digital Credentials API response', {
      result,
    })
  
    sendResponse({
      response: JSON.stringify(result.authorizationResponse),
    })
  }
  
  public async registerCredentialsForDcApi() {
    const agent = this.assertAndGetAgent()
    
    if (Platform.OS === 'ios') return

    const mdocRecords = await agent.mdoc.getAll()
    const sdJwtVcRecords = await agent.sdJwtVc.getAll()

    const mdocCredentials = mdocRecords.map(async (record): Promise<CredentialItem> => {
      const mdoc = record.firstCredential
      const { display } = getCredentialForDisplay(record)

      const iconDataUrl = display.backgroundImage?.url
        ? await loadCachedImageAsBase64DataUrl(agent.config.logger, display.backgroundImage?.url)
        : display.issuer.logo?.url
          ? await loadCachedImageAsBase64DataUrl(agent.config.logger, display.issuer.logo.url)
          : undefined

      return {
        id: record.id,
        credential: {
          doctype: mdoc.docType,
          format: 'mso_mdoc',
          namespaces: mapMdocAttributes(mdoc.issuerSignedNamespaces),
        },
        display: {
          title: display.name,
          subtitle: `Issued by ${display.issuer.name}`,
          claims: mapMdocAttributesToClaimDisplay(mdoc.issuerSignedNamespaces),
          iconDataUrl,
        },
      } as const
    })

    const sdJwtCredentials = sdJwtVcRecords.map(async (record): Promise<CredentialItem> => {
      const sdJwtVc = record.firstCredential
      const { display } = getCredentialForDisplay(record)

      const iconDataUrl = display.backgroundImage?.url
        ? await loadCachedImageAsBase64DataUrl(agent.config.logger, display.backgroundImage?.url)
        : display.issuer.logo?.url
          ? await loadCachedImageAsBase64DataUrl(agent.config.logger, display.issuer.logo.url)
          : undefined

      return {
        id: record.id,
        credential: {
          vct: record.getTags().vct,
          format: 'dc+sd-jwt',
          claims: sdJwtVc.prettyClaims as any,
        },
        display: {
          title: display.name,
          subtitle: `Issued by ${display.issuer.name}`,
          claims: mapSdJwtAttributesToClaimDisplay(sdJwtVc.prettyClaims),
          iconDataUrl,
        },
      } as const
    })

    const credentials = await Promise.all([...sdJwtCredentials, ...mdocCredentials])
    agent.config.logger.trace('Registering credentials for Digital Credentials API')

    await registerCredentials({
      credentials,
      matcher: 'cmwallet',
    })
  }
}
