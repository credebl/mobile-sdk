import { DidCommMediationRecord, DidCommMediatorPickupStrategy } from "@credo-ts/didcomm"
import { DidCommAgent } from "../DidCommSdk"

export class MediationRecipientApi {
  private agent: DidCommAgent

  public constructor(agent: DidCommAgent) {
    this.agent = agent
  }

  public async startMediation(mediatorInvitationUrl: string, myLabel: string) {
    const invite = await this.agent.didcomm.oob.parseInvitation(mediatorInvitationUrl)
    const outOfBandRecord = await this.agent.didcomm.oob.findByReceivedInvitationId(invite.id)

    let [connection] = outOfBandRecord ? await this.agent.didcomm.connections.findAllByOutOfBandId(outOfBandRecord.id) : []

    if (!connection) {
      this.agent.config.logger.debug('Mediation connection does not exist, creating connection')

      const invite = await this.agent.didcomm.oob.parseInvitation(mediatorInvitationUrl)
      const { connectionRecord: newConnection } = await this.agent.didcomm.oob.receiveInvitation(invite, {
        label: myLabel,
      })

      if (!newConnection) {
        this.agent.config.logger.debug('No connection record to provision mediation.')
        return
      }

      connection = newConnection
    }

    const readyConnection = connection.isReady ? connection : await this.agent.didcomm.connections.returnWhenIsConnected(connection.id)

    return this.agent.didcomm.mediationRecipient.provision(readyConnection)
  }

  /**
   * Initiate message pickup.
   *
   * @param mediator The didcomm mediator mediator record.
   * @param pickupStrategy The pickup strategy to use to initiate message pickup.
   */
  public async initiateMessagePickup(mediator?: DidCommMediationRecord | undefined, pickupStrategy?: DidCommMediatorPickupStrategy) {
    return this.agent.didcomm.mediationRecipient.initiateMessagePickup(mediator, pickupStrategy)
  }

  /**
  * Stop message pickup.
  *
  */
  public async stopMessagePickup() {
    return this.agent.didcomm.mediationRecipient.stopMessagePickup()
  }
}