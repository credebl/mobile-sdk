import type {
  AcceptCredentialOfferOptions,
  Agent,
  CredentialExchangeRecord,
  CredentialProtocol,
  DeleteCredentialOptions,
  ProposeCredentialOptions,
  SendCredentialProblemReportOptions,
} from '@credo-ts/core'

/**
 * Retrieves all credential exchange records from the agent.
 *
 * @param agent The agent instance to use for retrieving the credential exchange records.
 * @returns A promise that resolves to an array of credential exchange records.
 */
export const getAllCredentialExchangeRecords = async (agent: Agent) => {
  return agent.credentials.getAll()
}

/**
 * Retrieves the formatted data for a given credential record ID.
 *
 * @param agent The agent instance to use for retrieving the formatted data.
 * @param credentialRecordId The ID of the credential record to retrieve formatted data for.
 * @returns A Promise that resolves with the formatted data for the given credential record ID.
 */
export const getFormattedCredentialData = async (agent: Agent, credentialRecordId: string) => {
  return agent.credentials.getFormatData(credentialRecordId)
}

/**
 * Propose a credential to connection.
 *
 * @param agent The agent instance to use for accepting the credential offer.
 * @param options - The options for proposing the credential.
 * @returns A promise that resolves with the proposed credential.
 */
export const proposeCredential = async (agent: Agent, options: ProposeCredentialOptions<[]>) => {
  return agent.credentials.proposeCredential(options)
}

/**
 * Accepts a credential offer.
 *
 * @param agent The agent instance to use for accepting the credential offer.
 * @param options - The options for accepting the credential offer.
 * @returns A promise that resolves with the accepted credential.
 */
export const acceptCredentialOffer = async <CredentialProtocols extends CredentialProtocol[]>(
  agent: Agent,
  options: AcceptCredentialOfferOptions<CredentialProtocols>
) => {
  return agent.credentials.acceptOffer(options)
}

/**
 * Updates a credential exchange record.
 *
 * @param agent The agent instance to use for updating the credential exchange record.
 * @param credentialRecord The credential exchange record to update.
 * @returns A promise that resolves with the updated credential exchange record.
 */
export const updateCredentialExchangeRecord = async (agent: Agent, credentialRecord: CredentialExchangeRecord) => {
  return agent.credentials.update(credentialRecord)
}

/**
 * Declines a credential offer.
 *
 * @param agent The agent instance to use for declining the credential offer.
 * @param credentialId The ID of the credential offer to decline.
 * @returns A Promise that resolves CredentialExchangeRecord when the credential offer has been declined.
 */
export const declineCredentialOffer = async (agent: Agent, credentialId: string) => {
  return agent.credentials.declineOffer(credentialId)
}

/**
 * Deletes a credential exchange record with the given ID.
 *
 * @param agent The agent instance to use for deleting the credential exchange record.
 * @param credentialRecordId The ID of the credential exchange record to delete.
 * @param options Optional parameters for deleting the credential exchange record.
 *
 * @returns void
 */
export const deleteCredentialExchangeRecordById = async (
  agent: Agent,
  credentialRecordId: string,
  options?: DeleteCredentialOptions
) => {
  return agent.credentials.deleteById(credentialRecordId, options)
}

/**
 * Sends a problem report for a credential to Agent.
 *
 * @param agent The agent instance to use for sending the problem report.
 * @param options - The options for sending the problem report.
 * @returns A Promise that resolves CredentialExchangeRecord when the problem report has been sent.
 */
export const sendCredentialProblemReport = async (agent: Agent, options: SendCredentialProblemReportOptions) => {
  return agent.credentials.sendProblemReport(options)
}

// W3C Credential

/**
 * Retrieves a W3C credential record by its ID.
 *
 * @param agent The agent instance to use for retrieving the credential record.
 * @param credentialRecordId The ID of the credential record to retrieve.
 * @returns A Promise that resolves to the retrieved w3c credential record.
 */
export const getW3cCredentialRecordById = async (agent: Agent, credentialRecordId: string) => {
  return agent.w3cCredentials.getCredentialRecordById(credentialRecordId)
}

/**
 * Retrieves all W3C credential records from the agent.
 *
 * @returns A promise that resolves to an array of W3C credential records.
 */
export const getAllW3cCredentialRecords = async (agent: Agent) => {
  return agent.w3cCredentials.getAllCredentialRecords()
}
