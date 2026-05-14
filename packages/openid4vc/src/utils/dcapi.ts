import { DigitalCredentialsRequest } from '@animo-id/expo-digital-credentials-api'
import { CredentialsForProofRequest } from '../OpenIDSdk'

export function extractProviderRequest(request: DigitalCredentialsRequest) {
  const { request: innerRequest, selectedEntry } = request

  if (innerRequest.requests) {
    return innerRequest.requests[selectedEntry.providerIndex]?.data
  }

  return innerRequest.providers[selectedEntry.providerIndex]?.request
}

export function ensureSingleCredentialRequest(result: CredentialsForProofRequest) {
  if (result.formattedSubmission.entries.length !== 1) {
    throw new Error('Digital Credentials API supports only a single credential request')
  }
}

export function applySelectedCredentialFilter(result: CredentialsForProofRequest, credentialId: string) {
  const entry = result.formattedSubmission.entries[0]

  if (!entry.isSatisfied) return

  const match = entry.credentials.find((c) => c.credential.record.id === credentialId)

  if (!match) {
    throw new Error(`Selected credential '${credentialId}' was not found in the resolved credentials`)
  }

  // Limit to only the selected credential
  entry.credentials = [match]
}
