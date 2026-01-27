import type {
  CreateOutOfBandInvitationConfig,
  DidCommConnectionInvitationMessage,
  DidCommOutOfBandInvitation,
  ReceiveOutOfBandInvitationConfig,
} from '@credo-ts/didcomm'
import type { DidCommAgent } from '../DidCommSdk'

export class ConnectionsApi {
  private agent: DidCommAgent

  public constructor(agent: DidCommAgent) {
    this.agent = agent
  }

  /**
   * Creates an out-of-band invitation for establishing a connection with another agent.
   */
  public async createInvitation(domain: string, config?: CreateOutOfBandInvitationConfig) {
    const record = await this.agent.didcomm.oob.createInvitation(config)
    const invitationUrl = record.outOfBandInvitation.toUrl({ domain })

    return {
      record,
      invitation: record.outOfBandInvitation,
      invitationUrl,
    }
  }

  /**
   * Accepts a connection invitation message or out-of-band invitation and returns the connection record.
   */
  public async acceptInvitation(
    invitation: DidCommOutOfBandInvitation | DidCommConnectionInvitationMessage,
    config: ReceiveOutOfBandInvitationConfig
  ) {
    return this.agent.didcomm.oob.receiveInvitation(invitation, config)
  }

  /**
   * Parses an invitation from a URL.
   */
  public async parseInvitationFromUrl(invitationUrl: string) {
    return this.agent.didcomm.oob.parseInvitation(invitationUrl)
  }

  /**
   * Accepts a connection invitation from a URL.
   */
  public async acceptInvitationFromUrl(invitationUrl: string, config: ReceiveOutOfBandInvitationConfig) {
    const invitation = await this.agent.didcomm.oob.parseInvitation(invitationUrl)

    if (!invitation) {
      throw new Error('Could not parse invitation from URL')
    }

    const record = await this.agent.didcomm.oob.receiveInvitation(invitation, config)
    const connectionRecord = record?.connectionRecord

    if (!connectionRecord?.id) {
      throw new Error('Connection does not have an ID')
    }

    return record
  }

  /**
   * Returns all connections from the agent.
   */
  public async getAll() {
    return this.agent.didcomm.connections.getAll()
  }

  /**
   * Retrieves a connection record by connectionId.
   */
  public async getById(connectionId: string) {
    return this.agent.didcomm.connections.getById(connectionId)
  }

  /**
   * Finds a connection record by its ID.
   */
  public async findById(connectionId: string) {
    return this.agent.didcomm.connections.findById(connectionId)
  }

  /**
   * Finds an out-of-band record by its ID.
   */
  public async findOutOfBandRecordById(outOfBandId: string) {
    return this.agent.didcomm.oob.findById(outOfBandId)
  }

  /**
   * Finds an out-of-band record by its invitation ID.
   */
  public async findByReceivedInvitationId(receivedInvitationId: string) {
    return this.agent.didcomm.oob.findByReceivedInvitationId(receivedInvitationId)
  }

  /**
   * Deletes a connection record by its ID.
   */
  public async deleteById(connectionId: string) {
    await this.agent.didcomm.connections.deleteById(connectionId)
    return true
  }

  /**
   * Deletes an out-of-band record by its ID.
   */
  public async deleteOobRecordById(outOfBandId: string) {
    await this.agent.didcomm.oob.deleteById(outOfBandId)
    return true
  }
}
