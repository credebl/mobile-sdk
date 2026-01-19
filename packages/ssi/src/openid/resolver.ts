import { JwaSignatureAlgorithm } from '@credo-ts/core'
import type {
  OpenId4VciCredentialConfigurationSupportedWithFormats,
  OpenId4VciRequestTokenResponse,
  OpenId4VciResolvedAuthorizationRequest,
  OpenId4VciResolvedCredentialOffer,
} from '@credo-ts/openid4vc'
import {
  getOfferedCredentials,
  getScopesFromCredentialConfigurationsSupported,
  preAuthorizedCodeGrantIdentifier,
} from '@credo-ts/openid4vc'

import type { AdeyaAgent } from '../agent'
import { credentialRecordFromCredential, encodeCredential } from '../format/credentialEncoding'
import { setBatchCredentialMetadata } from './batchMetadata'
import { getCredentialBindingResolver } from './credentialBindingResolver'
import { extractOpenId4VcCredentialMetadata, setOpenId4VcCredentialMetadata } from './metadata'

export type OpenID4VCIParam = {
  agent: AdeyaAgent
  data?: string
  uri?: string
}

export async function resolveOpenId4VciOffer({
  agent,
  offer,
  authorization,
  customHeaders,
  fetchAuthorization = true,
}: {
  agent: AdeyaAgent
  offer: { uri: string }
  authorization?: { clientId: string; redirectUri: string }
  customHeaders?: Record<string, unknown>
  fetchAuthorization?: boolean
}) {
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

export async function acquirePreAuthorizedAccessToken({
  agent,
  resolvedCredentialOffer,
  txCode,
}: {
  agent: AdeyaAgent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  txCode?: string
}) {
  return await agent.modules.openId4VcHolder.requestToken({
    resolvedCredentialOffer,
    txCode,
  })
}

export async function acquireAuthorizationCodeAccessToken({
  resolvedCredentialOffer,
  agent,
  codeVerifier,
  authorizationCode,
  clientId,
  redirectUri,
}: {
  agent: AdeyaAgent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  codeVerifier?: string
  authorizationCode: string
  clientId: string
  redirectUri?: string
}) {
  return await agent.modules.openId4VcHolder.requestToken({
    resolvedCredentialOffer,
    code: authorizationCode,
    codeVerifier,
    redirectUri,
    clientId,
  })
}

export const receiveCredentialFromOpenId4VciOffer = async ({
  agent,
  resolvedCredentialOffer,
  credentialConfigurationIdsToRequest,
  accessToken,
  clientId,
  pidSchemes,
  requestBatch,
}: {
  agent: AdeyaAgent
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer
  credentialConfigurationIdsToRequest?: string[]
  clientId?: string
  pidSchemes?: { sdJwtVcVcts: Array<string>; msoMdocDoctypes: Array<string> }
  requestBatch?: boolean | number

  // TODO: cNonce should maybe be provided separately (multiple calls can have different c_nonce values)
  accessToken: OpenId4VciRequestTokenResponse
}) => {
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
    credentialBindingResolver: getCredentialBindingResolver(),
  })

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  return credentials.credentials.map(({ credentials, ...credentialResponse }: any) => {
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

    // Match metadata
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
