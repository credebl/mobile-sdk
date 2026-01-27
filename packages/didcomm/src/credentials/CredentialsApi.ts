import {
  type AcceptCredentialOfferOptions,
  type DeclineCredentialOfferOptions,
  type DeleteCredentialOptions,
  type DidCommCredentialExchangeRecord,
  type ProposeCredentialOptions,
  type SendCredentialProblemReportOptions,
} from '@credo-ts/didcomm'
import { DidCommAgent, DidCommAgentModules } from '../DidCommSdk'

export type DidCommCredentialProtocols = DidCommAgentModules['didcomm']['modules']['credentials']['config']['credentialProtocols']

export class CredentialsApi {
  private agent: DidCommAgent

  public constructor(agent: DidCommAgent) {
    this.agent = agent
  }

  /**
   * Retrieves all credential exchange records from the agent.
   *
   * @returns A promise that resolves to an array of credential exchange records.
   */
  public async getAllCredentialExchangeRecords() {
    return this.agent.didcomm.credentials.getAll()
  }

  /**
   * Retrieves the formatted data for a given credential record ID.
   *
   * @param credentialRecordId The ID of the credential record to retrieve formatted data for.
   * @returns A Promise that resolves with the formatted data for the given credential record ID.
   */
  public async getFormattedCredentialData(credentialRecordId: string) {
    return this.agent.didcomm.credentials.getFormatData(credentialRecordId)
  }

  /**
   * Propose a credential to connection.
   *
   * @param options - The options for proposing the credential.
   * @returns A promise that resolves with the proposed credential.
   */
  public async proposeCredential(options: ProposeCredentialOptions<DidCommCredentialProtocols>) {
    return this.agent.didcomm.credentials.proposeCredential(options)
  }

  /**
   * Accepts a credential offer.
   *
   * @param options - The options for accepting the credential offer.
   * @returns A promise that resolves with the accepted credential.
   */
  public async acceptCredentialOffer(options: AcceptCredentialOfferOptions<DidCommCredentialProtocols>) {
    return this.agent.didcomm.credentials.acceptOffer(options)
  }

  /**
   * Updates a credential exchange record.
   *
   * @param credentialRecord The credential exchange record to update.
   * @returns A promise that resolves with the updated credential exchange record.
   */
  public async updateCredentialExchangeRecord(credentialRecord: DidCommCredentialExchangeRecord) {
    return this.agent.didcomm.credentials.update(credentialRecord)
  }

  /**
   * Declines a credential offer.
   *
   * @param credentialId The ID of the credential offer to decline.
   * @returns A Promise that resolves CredentialExchangeRecord when the credential offer has been declined.
   */
  public async declineCredentialOffer(options: DeclineCredentialOfferOptions) {
    return this.agent.didcomm.credentials.declineOffer(options)
  }

  /**
   * Deletes a credential exchange record with the given ID.
   *
   * @param credentialRecordId The ID of the credential exchange record to delete.
   * @param options Optional parameters for deleting the credential exchange record.
   *
   * @returns void
   */
  public async deleteCredentialExchangeRecordById(credentialRecordId: string, options?: DeleteCredentialOptions) {
    return this.agent.didcomm.credentials.deleteById(credentialRecordId, options)
  }

  /**
   * Sends a problem report for a credential to Agent.
   *
   * @param options - The options for sending the problem report.
   * @returns A Promise that resolves CredentialExchangeRecord when the problem report has been sent.
   */
  public async sendCredentialProblemReport(options: SendCredentialProblemReportOptions) {
    return this.agent.didcomm.credentials.sendProblemReport(options)
  }
}
