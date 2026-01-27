import type {
  AcceptProofRequestOptions,
  CreateProofRequestOptions,
  DeclineProofRequestOptions,
  DidCommProofExchangeRecord,
  GetCredentialsForProofRequestOptions,
  ProposeProofOptions,
  RequestProofOptions,
  SelectCredentialsForProofRequestOptions,
  SendProofProblemReportOptions,
} from '@credo-ts/didcomm'
import { DidCommAgent, DidCommAgentModules } from '../DidCommSdk'

export type DidCommProofProtocols = DidCommAgentModules['didcomm']['modules']['proofs']['config']['proofProtocols']

export class ProofsApi {
  private agent: DidCommAgent

  public constructor(agent: DidCommAgent) {
    this.agent = agent
  }

  /**
   * Retrieves the formatted data for a proof record with the given ID.
   *
   * @param proofRecordId The ID of the proof record to retrieve format data for.
   * @returns A Promise that resolves with the format data for the proof record.
   */
  public async getProofFormatData(proofRecordId: string) {
    return this.agent.didcomm.proofs.getFormatData(proofRecordId)
  }

  /**
   * Retrieves the available credentials for a proof request.
   *
   * @param options The options for retrieving the credentials.
   * @returns A Promise that resolves with the credentials for the proof request.
   */
  public async getCredentialsForProofRequest<ProofProtocols extends DidCommProofProtocols = DidCommProofProtocols>(
    options: GetCredentialsForProofRequestOptions<ProofProtocols>
  ) {
    return this.agent.didcomm.proofs.getCredentialsForRequest(options)
  }

  /**
   * Select the credentials to be used for a proof request.
   *
   * @param options - The options for selecting the credentials.
   * @returns A promise that resolves to the selected credentials.
   */
  public async selectCredentialsForProofRequest<ProofProtocols extends DidCommProofProtocols = DidCommProofProtocols>(
    options: SelectCredentialsForProofRequestOptions<ProofProtocols>
  ) {
    return this.agent.didcomm.proofs.selectCredentialsForRequest(options)
  }

  /**
   * Retrieves the proof request agent message associated with the given proof record ID.
   *
   * @param proofRecordId The ID of the proof record to retrieve the request message for.
   * @returns A Promise that resolves to the proof request message.
   */
  public async getProofRequestAgentMessage(proofRecordId: string) {
    return this.agent.didcomm.proofs.findRequestMessage(proofRecordId)
  }

  /**
   * Propose a proof to connection.
   *
   * @param options - The options for proposing the proof.
   * @returns A promise that resolves with the proposed proof.
   */
  public async proposeProof(options: ProposeProofOptions<DidCommProofProtocols>) {
    return this.agent.didcomm.proofs.proposeProof(options)
  }

  /**
   * Creates a proof request.
   *
   * @param options - The options for creating the proof request.
   * @returns A promise that resolves to the created proof request.
   */
  public async createProofRequest(options: CreateProofRequestOptions<DidCommProofProtocols>) {
    return this.agent.didcomm.proofs.createRequest(options)
  }

  /**
   * Requests a proof.
   *
   * @param options - The options for requesting the proof.
   * @returns A Promise that resolves with the ProofExchangeRecord
   */
  public async requestProof(options: RequestProofOptions<DidCommProofProtocols>) {
    return this.agent.didcomm.proofs.requestProof(options)
  }

  /**
   * Update a proof exchange record.
   *
   * @param proofRecord The proof exchange record to update.
   * @returns void.
   */
  public async updateProofRecord(proofRecord: DidCommProofExchangeRecord) {
    return this.agent.didcomm.proofs.update(proofRecord)
  }

  /**
   * Accepts a proof request .
   *
   * @param options - The options for accepting the proof request.
   * @returns A Promise that resolves with the result of accepting the proof request.
   */
  public async acceptProofRequest<ProofProtocols extends DidCommProofProtocols = DidCommProofProtocols>(
    options: AcceptProofRequestOptions<ProofProtocols>
  ) {
    return this.agent.didcomm.proofs.acceptRequest(options)
  }

  /**
   * Decline a proof request.
   *
   * @param options - The options for declining the proof request.
   * @returns A Promise that resolves ProofExchangeRecord of declining the proof request.
   */
  public async declineProofRequest(options: DeclineProofRequestOptions) {
    return this.agent.didcomm.proofs.declineRequest(options)
  }

  /**
   * Sends a problem report for a proof to Agent.
   *
   * @param options - The options for sending the problem report.
   * @returns A Promise that resolves ProofExchangeRecord when the problem report has been sent.
   */
  public async sendProofProblemReport(options: SendProofProblemReportOptions) {
    return this.agent.didcomm.proofs.sendProblemReport(options)
  }

}