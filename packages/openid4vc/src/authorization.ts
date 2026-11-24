import {
  getScopesFromCredentialConfigurationsSupported,
  type OpenId4VciResolvedCredentialOffer,
} from '@credo-ts/openid4vc'

/** A requested credential configuration ID is not offered by this issuer. */
export class UnknownCredentialConfigurationIdError extends Error {
  public constructor(public readonly credentialConfigurationIds: string[]) {
    super(`Credential configuration ID(s) not offered by the issuer: ${credentialConfigurationIds.join(', ')}`)
    this.name = 'UnknownCredentialConfigurationIdError'
  }
}

/**
 * Resolve the OAuth scopes for the credential configuration IDs the wallet intends to request.
 *
 * When no IDs are supplied, the scopes of all offered configurations are returned (the historical behaviour).
 * Supplying IDs limits the authorization request to only those credentials, so a wallet asking for one credential
 * does not request scopes for everything the issuer offers. Duplicate scopes are removed by Credo's helper.
 *
 * Unknown IDs are rejected rather than silently ignored: an empty or wrong scope can otherwise result in an
 * authorization request for a different credential than the caller intended.
 */
export function getScopesForCredentialConfigurationIds(
  resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer,
  credentialConfigurationIdsToRequest?: string[]
): string[] {
  const offered = resolvedCredentialOffer.offeredCredentialConfigurations

  if (!credentialConfigurationIdsToRequest) {
    return getScopesFromCredentialConfigurationsSupported(offered)
  }

  const unknownIds = credentialConfigurationIdsToRequest.filter((id) => !(id in offered))
  if (unknownIds.length > 0) throw new UnknownCredentialConfigurationIdError(unknownIds)

  const requestedConfigurations = Object.fromEntries(
    Object.entries(offered).filter(([id]) => credentialConfigurationIdsToRequest.includes(id))
  )

  return getScopesFromCredentialConfigurationsSupported(requestedConfigurations)
}
