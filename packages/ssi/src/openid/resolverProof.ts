import type { DcqlQueryResult, DifPexCredentialsForRequest, DifPresentationExchangeDefinitionV2 } from '@credo-ts/core'
import type { AdeyaAgent } from '../agent'

import { JSONPath } from '@astronautlabs/jsonpath'
import { ClaimFormat, Jwt } from '@credo-ts/core'
import { X509ModuleConfig } from '@credo-ts/core'
import queryString from 'query-string'
import { getAttributesAndMetadataForMdocPayload, getCredentialForDisplay } from './display'
import {
  type FormattedSubmission,
  type FormattedSubmissionEntry,
  type FormattedSubmissionEntrySatisfiedCredential,
  getAttributesAndMetadataForSdJwtPayload,
  getDisclosedAttributePathArrays,
  getSelectedCredentialsForRequest,
} from './displayProof'
import type { ParseInvitationResult } from './openIdHelpers'

export type TrustedX509Entity = { certificate: string; name: string; logoUri: string; url: string }
export type GetCredentialsForProofRequestOptions = {
  agent: AdeyaAgent
  requestPayload?: Record<string, unknown>
  uri?: string
  allowUntrustedFederation?: boolean
  origin?: string
  trustedX509Entities?: TrustedX509Entity[]
}
export type NonEmptyArray<T> = [T, ...T[]]

export type CredentialsForProofRequest = Awaited<ReturnType<typeof getOID4VCCredentialsForProofRequest>>

function handleTextResponse(text: string): ParseInvitationResult {
  // If the text starts with 'ey' we assume it's a JWT and thus an OpenID authorization request
  if (text.startsWith('ey')) {
    return {
      success: true,
      result: {
        format: 'parsed',
        type: 'openid-authorization-request',
        data: text,
      },
    }
  }

  // Otherwise we still try to parse it as JSON
  try {
    const json: unknown = JSON.parse(text)
    return handleJsonResponse(json)

    // handel like above
  } catch (error) {
    throw new Error(`[handleTextResponse] Error:${error}`)
  }
}

function handleJsonResponse(json: unknown): ParseInvitationResult {
  // We expect a JSON object
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('[handleJsonResponse] Invitation not recognized.')
  }

  // if ('@type' in json) {
  //   return {
  //     success: true,
  //     result: {
  //       format: 'parsed',
  //       type: 'didcomm',
  //       data: json
  //     }
  //   }
  // }

  if ('credential_issuer' in json) {
    return {
      success: true,
      result: {
        format: 'parsed',
        type: 'openid-credential-offer',
        data: json,
      },
    }
  }

  throw new Error('[handleJsonResponse] Invitation not recognized.')
}

export async function fetchInvitationDataUrl(dataUrl: string): Promise<ParseInvitationResult> {
  // If we haven't had a response after 10 seconds, we will handle as if the invitation is not valid.
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 10000)

  try {
    // If we still don't know what type of invitation it is, we assume it is a URL that we need to fetch to retrieve the invitation.
    const response = await fetch(dataUrl, {
      headers: {
        // for DIDComm out of band invitations we should include application/json
        // but we are flexible and also want to support other types of invitations
        // as e.g. the OpenID SIOP request is a signed encoded JWT string
        Accept: 'application/json, text/plain, */*',
      },
    })
    clearTimeout(timeout)
    if (!response.ok) {
      throw new Error('[retrieve_invitation_error] Unable to retrieve invitation.')
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const json: unknown = await response.json()
      return handleJsonResponse(json)
    }
    const text = await response.text()
    return handleTextResponse(text)
  } catch (error) {
    clearTimeout(timeout)
    throw new Error(`[retrieve_invitation_error] Unable to retrieve invitation: ${error}`)
  }
}

const extractCertificateFromJwt = (jwt: string) => {
  const jwtHeader = Jwt.fromSerializedJwt(jwt).header
  return Array.isArray(jwtHeader.x5c) && typeof jwtHeader.x5c[0] === 'string' ? jwtHeader.x5c[0] : null
}

/**
 * This is a temp method to allow for untrusted certificates to still work with the wallet.
 */
export const extractCertificateFromAuthorizationRequest = async ({
  data,
  uri,
}: {
  data?: string
  uri?: string
}): Promise<{ data: string | null; certificate: string | null }> => {
  try {
    if (data) {
      return {
        data,
        certificate: extractCertificateFromJwt(data),
      }
    }

    if (uri) {
      const query = queryString.parseUrl(uri).query
      if (query.request_uri && typeof query.request_uri === 'string') {
        const result = await fetchInvitationDataUrl(query.request_uri)
        if (
          result.success &&
          result.result.type === 'openid-authorization-request' &&
          typeof result.result.data === 'string'
        ) {
          return {
            data: result.result.data,
            certificate: extractCertificateFromJwt(result.result.data),
          }
        }
      } else if (query.request && typeof query.request === 'string') {
        const _res = {
          data: query.request,
          certificate: extractCertificateFromJwt(query.request),
        }
        return _res
      }
    }
    return { data: null, certificate: null }
  } catch (error) {
    return { data: null, certificate: null }
  }
}

export async function withTrustedCertificate<T>(
  agent: AdeyaAgent,
  certificate: string | null,
  method: () => Promise<T> | T
): Promise<T> {
  const x509ModuleConfig = agent.dependencyManager.resolve(X509ModuleConfig)
  const currentTrustedCertificates = x509ModuleConfig?.trustedCertificates
    ? [...x509ModuleConfig.trustedCertificates]
    : []

  try {
    if (certificate) {
      agent?.x509.addTrustedCertificate(certificate)
    }
    return await method()
  } finally {
    if (certificate) x509ModuleConfig.setTrustedCertificates(currentTrustedCertificates as [string])
  }
}

export const shareProof = async ({
  agent,
  resolvedRequest,
  selectedCredentials,
  acceptTransactionData,
}: {
  agent: AdeyaAgent
  resolvedRequest: CredentialsForProofRequest
  selectedCredentials: { [inputDescriptorId: string]: string }
  // FIXME: Should be a more complex structure allowing which credential to use for which entry
  acceptTransactionData?: boolean
}) => {
  const { authorizationRequest } = resolvedRequest
  if (
    !resolvedRequest.credentialsForRequest?.areRequirementsSatisfied &&
    !resolvedRequest.queryResult?.canBeSatisfied
  ) {
    throw new Error('Requirements from proof request are not satisfied')
  }

  // Map all requirements and entries to a credential record. If a credential record for an
  // input descriptor has been provided in `selectedCredentials` we will use that. Otherwise
  // it will pick the first available credential.
  const presentationExchangeCredentials = resolvedRequest.credentialsForRequest
    ? Object.fromEntries(
      await Promise.all(
        resolvedRequest.credentialsForRequest.requirements.flatMap((requirement) =>
          requirement.submissionEntry.slice(0, requirement.needsCount).map(async (entry) => {
            const credentialId = selectedCredentials[entry.inputDescriptorId]
            const credential =
              entry.verifiableCredentials.find((vc) => vc.credentialRecord.id === credentialId) ??
              entry.verifiableCredentials[0]

            return [entry.inputDescriptorId, [{ ...credential }]]
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
            : agent.modules.openId4VcHolder.selectCredentialsForDcqlRequest(resolvedRequest.queryResult)
        ).map(async ([queryCredentialId, credential]) => {
          return [queryCredentialId, { ...credential }]
        })
      )
    )
    : undefined

  const result = await agent.modules.openId4VcHolder.acceptOpenId4VpAuthorizationRequest({
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

export function formatDifPexCredentialsForRequest(
  credentialsForRequest: DifPexCredentialsForRequest,
  definition: DifPresentationExchangeDefinitionV2
): FormattedSubmission {
  const entries = credentialsForRequest.requirements.flatMap((requirement) => {
    // We take the first needsCount entries. Even if not satisfied we will just show these first entries as missing (otherwise it becomes too complex)
    // If selection is possible they can choose alternatives within that (otherwise it becomes too complex)
    const submissionEntries = requirement.submissionEntry.slice(0, requirement.needsCount)

    return submissionEntries.map((submission): FormattedSubmissionEntry => {
      if (submission.verifiableCredentials.length >= 1) {
        return {
          inputDescriptorId: submission.inputDescriptorId,
          name: submission.name,
          description: submission.purpose,
          isSatisfied: true,
          credentials: submission.verifiableCredentials.map(
            (verifiableCredential): FormattedSubmissionEntrySatisfiedCredential => {
              const credentialForDisplay = getCredentialForDisplay(verifiableCredential.credentialRecord)

              // By default the whole credential is disclosed
              let disclosed: FormattedSubmissionEntrySatisfiedCredential['disclosed']
              if (verifiableCredential.claimFormat === ClaimFormat.SdJwtVc) {
                const { attributes, metadata } = getAttributesAndMetadataForSdJwtPayload(
                  verifiableCredential.disclosedPayload
                )
                disclosed = {
                  attributes,
                  metadata,
                  paths: getDisclosedAttributePathArrays(attributes, 2),
                }
              } else {
                disclosed = {
                  attributes: credentialForDisplay.attributes,
                  metadata: credentialForDisplay.metadata,
                  paths: getDisclosedAttributePathArrays(credentialForDisplay.attributes, 2),
                }
              }

              return {
                credential: credentialForDisplay,
                disclosed,
              }
            }
          ) as NonEmptyArray<FormattedSubmissionEntrySatisfiedCredential>,
        }
      }

      // Try to determine requested attributes for credential
      const inputDescriptor = definition.input_descriptors.find(({ id }) => id === submission.inputDescriptorId)
      const requestedAttributePaths =
        inputDescriptor?.constraints?.fields
          ?.map((a) =>
            simplifyJsonPath(a.path[0], inputDescriptor.format?.mso_mdoc ? ClaimFormat.MsoMdoc : undefined)?.filter(
              (entry): entry is string => entry !== null
            )
          )
          .filter((path): path is string[] => path !== undefined) ?? []

      const docType = inputDescriptor?.format?.mso_mdoc ? inputDescriptor.id : undefined
      const vctField = inputDescriptor?.format?.['vc+sd-jwt']
        ? inputDescriptor.constraints.fields?.find((field) => field.path.includes('$.vct'))
        : undefined
      const vct = (vctField?.filter?.const ?? vctField?.filter?.enum?.[0]) as string | undefined

      return {
        inputDescriptorId: submission.inputDescriptorId,
        name: requirement.name ?? docType ?? vct?.replace('https://', ''),
        description: requirement.purpose,
        isSatisfied: false,
        requestedAttributePaths: requestedAttributePaths,
      }
    })
  })

  return {
    areAllSatisfied: entries.every((entry) => entry.isSatisfied),
    name: credentialsForRequest.name ?? 'unknown',
    purpose: credentialsForRequest.purpose,
    entries,
  }
}

export function formatDcqlCredentialsForRequest(dcqlQueryResult: DcqlQueryResult): FormattedSubmission {
  const credentialSets: NonNullable<DcqlQueryResult['credential_sets']> = dcqlQueryResult.credential_sets ?? [
    // If no credential sets are defined we create a default one with just all the credential options
    {
      required: true,
      options: [dcqlQueryResult.credentials.map((c) => c.id)],
      matching_options: dcqlQueryResult.canBeSatisfied ? [dcqlQueryResult.credentials.map((c) => c.id)] : undefined,
    },
  ]

  const entries: FormattedSubmissionEntry[] = []
  for (const credentialSet of credentialSets) {
    // Take first matching option, otherwise take first option
    for (const credentialId of credentialSet.matching_options?.[0] ?? credentialSet.options[0]) {
      const match = dcqlQueryResult.credential_matches[credentialId]
      const queryCredential = dcqlQueryResult.credentials.find((c) => c.id === credentialId)
      if (!queryCredential) {
        throw new Error(`Credential '${credentialId}' not found in dcql query`)
      }

      if (!match || !match.success) {
        const placeholderCredential = extractCredentialPlaceholderFromQueryCredential(queryCredential)
        entries.push({
          isSatisfied: false,
          inputDescriptorId: credentialId,
          name: placeholderCredential.credentialName,
          requestedAttributePaths: placeholderCredential.requestedAttributePaths ?? [],
        })
        continue
      }

      const credentialForDisplay = getCredentialForDisplay(match.record)

      let disclosed: FormattedSubmissionEntrySatisfiedCredential['disclosed']
      if (match.output.credential_format === 'vc+sd-jwt' || match.output.credential_format === 'dc+sd-jwt') {
        if (match.record.type !== 'SdJwtVcRecord') throw new Error('Expected SdJwtRecord')

        if (queryCredential.format !== 'vc+sd-jwt' && queryCredential.format !== 'dc+sd-jwt') {
          throw new Error(`Expected query credential format ${queryCredential.format} to be vc+sd-jwt or dc+sd-jwt`)
        }

        // Credo Already applied selective disclosure on payload
        const { attributes, metadata } = getAttributesAndMetadataForSdJwtPayload(match.output.claims)
        disclosed = {
          attributes,
          metadata,
          paths: getDisclosedAttributePathArrays(attributes, 2),
        }
      } else if (match.output.credential_format === 'mso_mdoc') {
        if (match.record.type !== 'MdocRecord') throw new Error('Expected MdocRecord')

        // TODO: check if fixed now
        // FIXME: the disclosed payload here doesn't have the correct encoding anymore
        // once we serialize input??
        disclosed = {
          ...getAttributesAndMetadataForMdocPayload(match.output.namespaces, match.record.credential),
          paths: getDisclosedAttributePathArrays(match.output.namespaces, 2),
        }
      } else {
        if (match.record.type !== 'W3cCredentialRecord') throw new Error('Expected W3cCredentialRecord')

        // All paths disclosed for W3C
        disclosed = {
          attributes: credentialForDisplay.attributes,
          metadata: credentialForDisplay.metadata,
          paths: getDisclosedAttributePathArrays(credentialForDisplay.attributes, 2),
        }
      }

      entries.push({
        inputDescriptorId: credentialId,
        credentials: [
          {
            credential: credentialForDisplay,
            disclosed,
          },
        ],
        isSatisfied: true,
        name: credentialForDisplay.display.name,
      })
    }
  }

  return {
    name: "DCQL",
    areAllSatisfied: entries.every((entry) => entry.isSatisfied),
    purpose: credentialSets.map((s) => s.purpose).find((purpose): purpose is string => typeof purpose === 'string'),
    entries,
  }
}

export const getOID4VCCredentialsForProofRequest = async ({
  agent,
  uri,
  requestPayload,
  allowUntrustedFederation = true,
  origin,
  trustedX509Entities,
}: GetCredentialsForProofRequestOptions) => {
  // const { entityId = undefined, data: fromFederationData = null } = allowUntrustedFederation
  //   ? await extractEntityIdFromAuthorizationRequest({ uri, requestPayload, origin })
  //   : {}

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

  const resolved = await agent.modules.openId4VcHolder.resolveOpenId4VpAuthorizationRequest(request, {})

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
      resolved.presentationExchange.definition as DifPresentationExchangeDefinitionV2
    )
  } else if (resolved.dcql) {
    formattedSubmission = formatDcqlCredentialsForRequest(resolved.dcql.queryResult)
  } else {
    throw new Error('No presentation exchange or dcql found in authorization request.')
  }

  return {
    ...resolved.presentationExchange,
    ...resolved.dcql,
    // FIXME: origin should be part of resolved from Credo, as it's also needed
    // in the accept method now, which wouldn't be the case if we just add it to
    // the resolved version
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

function simplifyJsonPath(path: string, format?: ClaimFormat, filterKeys: string[] = []) {
  try {
    const parsedPath: Array<{
      scope: string
      operation: string
      expression: { type: string; value: string;[key: string]: unknown }
    }> = JSONPath.parse(path)

    if (!Array.isArray(parsedPath)) {
      return null
    }

    const simplified: Array<string | null> = []

    if (format === ClaimFormat.MsoMdoc) {
      if (parsedPath.length === 3) {
        simplified.push(parsedPath[2].expression.value)
      }
    } else {
      for (const entry of parsedPath) {
        // Skip entries we want to remove
        const value = entry.expression.value
        if (['vc', 'vp', 'credentialSubject'].includes(value)) {
          continue
        }

        // Remove root
        if (entry.expression.type === 'root') {
          continue
        }

        if (
          entry.expression.type === 'wildcard' ||
          (entry.expression.type === 'numeric_literal' && !Number.isNaN(value))
        ) {
          // Replace wildcards and numeric indices with null
          simplified.push(null)
        }

        if (entry.expression.type === 'identifier' || entry.expression.type === 'string_literal') {
          // Return the identifier value for normal entries
          simplified.push(value)
        }
      }
    }

    if (filterKeys.some((key) => simplified.includes(key))) {
      return null
    }

    return simplified
  } catch (error) {
    return null
  }
}

function extractCredentialPlaceholderFromQueryCredential(credential: DcqlQueryResult['credentials'][number]) {
  if (credential.format === 'mso_mdoc') {
    return {
      claimFormat: ClaimFormat.MsoMdoc,
      credentialName: credential.meta?.doctype_value ?? 'Unknown value',
      requestedAttributePaths: credential.claims?.map((c) => ('path' in c ? [c.path[1]] : [c.claim_name])),
    }
  }

  if (credential.format === 'vc+sd-jwt' || credential.format === 'dc+sd-jwt') {
    return {
      claimFormat: ClaimFormat.SdJwtVc,
      credentialName: credential.meta?.vct_values?.[0].replace('https://', ''),
      requestedAttributePaths: credential.claims?.map((c) => c.path),
    }
  }

  return {
    claimFormat: ClaimFormat.JwtVc,
    requestedAttributePaths: credential.claims?.map((c) => c.path),
  }
}