import type {
  AcceptProofRequestOptions,
  Agent,
  CreateProofRequestOptions,
  DeclineProofRequestOptions,
  DefaultProofProtocols,
  GetCredentialsForProofRequestOptions,
  ProofExchangeRecord,
  ProofProtocol,
  ProposeProofOptions,
  RequestProofOptions,
  SelectCredentialsForProofRequestOptions,
  SendProofProblemReportOptions,
} from '@credo-ts/core'

/**
 * Retrieves the formatted data for a proof record with the given ID.
 *
 * @param agent The agent instance to use for retrieving the format data.
 * @param proofRecordId The ID of the proof record to retrieve format data for.
 * @returns A Promise that resolves with the format data for the proof record.
 */
export const getProofFormatData = async (agent: Agent, proofRecordId: string) => {
  return agent.proofs.getFormatData(proofRecordId)
}

/**
 * Retrieves the available credentials for a proof request.
 *
 * @param agent The agent instance to use for retrieving the credentials.
 * @param options The options for retrieving the credentials.
 * @returns A Promise that resolves with the credentials for the proof request.
 */
export const getCredentialsForProofRequest = async <ProofProtocols extends ProofProtocol[] = ProofProtocol[]>(
  agent: Agent,
  options: GetCredentialsForProofRequestOptions<ProofProtocols>
) => {
  return agent.proofs.getCredentialsForRequest(options)
}

/**
 * Select the credentials to be used for a proof request.
 *
 * @param agent The agent instance to use for selecting the credentials.
 * @param options - The options for selecting the credentials.
 * @returns A promise that resolves to the selected credentials.
 */
export const selectCredentialsForProofRequest = async <ProofProtocols extends ProofProtocol[] = ProofProtocol[]>(
  agent: Agent,
  options: SelectCredentialsForProofRequestOptions<ProofProtocols>
) => {
  return agent.proofs.selectCredentialsForRequest(options)
}

/**
 * Retrieves the proof request agent message associated with the given proof record ID.
 *
 * @param agent The agent instance to use for retrieving the proof request message.
 * @param proofRecordId The ID of the proof record to retrieve the request message for.
 * @returns A Promise that resolves to the proof request message.
 */
export const getProofRequestAgentMessage = async (agent: Agent, proofRecordId: string) => {
  return agent.proofs.findRequestMessage(proofRecordId)
}

/**
 * Propose a proof to connection.
 *
 * @param agent The agent instance to use for proposing the proof.
 * @param options - The options for proposing the proof.
 * @returns A promise that resolves with the proposed proof.
 */
export const proposeProof = async (agent: Agent, options: ProposeProofOptions<DefaultProofProtocols>) => {
  return agent.proofs.proposeProof(options)
}

/**
 * Creates a proof request.
 *
 * @param agent The agent instance to use for creating the proof request.
 * @param options - The options for creating the proof request.
 * @returns A promise that resolves to the created proof request.
 */
export const createProofRequest = async (agent: Agent, options: CreateProofRequestOptions<DefaultProofProtocols>) => {
  return agent.proofs.createRequest(options)
}

/**
 * Requests a proof.
 *
 * @param agent The agent instance to use for requesting the proof.
 * @param options - The options for requesting the proof.
 * @returns A Promise that resolves with the ProofExchangeRecord
 */
export const requestProof = async (agent: Agent, options: RequestProofOptions<DefaultProofProtocols>) => {
  return agent.proofs.requestProof(options)
}

/**
 * Update a proof exchange record.
 *
 * @param agent The agent instance to use for updating the proof exchange record.
 * @param proofRecord The proof exchange record to update.
 * @returns void.
 */
export const updateProofRecord = (agent: Agent, proofRecord: ProofExchangeRecord) => {
  return agent.proofs.update(proofRecord)
}

/**
 * Accepts a proof request .
 *
 * @param agent The agent instance to use for accepting the proof request.
 * @param options - The options for accepting the proof request.
 * @returns A Promise that resolves with the result of accepting the proof request.
 */
export const acceptProofRequest = async <ProofProtocols extends ProofProtocol[] = ProofProtocol[]>(
  agent: Agent,
  options: AcceptProofRequestOptions<ProofProtocols>
) => {
  return agent.proofs.acceptRequest(options)
}

/**
 * Decline a proof request.
 *
 * @param agent The agent instance to use for declining the proof request.
 * @param options - The options for declining the proof request.
 * @returns A Promise that resolves ProofExchangeRecord of declining the proof request.
 */
export const declineProofRequest = async (agent: Agent, options: DeclineProofRequestOptions) => {
  return agent.proofs.declineRequest(options)
}

/**
 * Sends a problem report for a proof to Agent.
 *
 * @param options - The options for sending the problem report.
 * @returns A Promise that resolves ProofExchangeRecord when the problem report has been sent.
 */
export const sendProofProblemReport = async (agent: Agent, options: SendProofProblemReportOptions) => {
  return agent.proofs.sendProblemReport(options)
}
