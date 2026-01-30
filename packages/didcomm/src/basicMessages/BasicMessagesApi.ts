import { DidCommAgent } from '../DidCommSdk'

export class BasicMessagesApi {
  private agent: DidCommAgent

  public constructor(agent: DidCommAgent) {
    this.agent = agent
  }

  /**
   * Sends a basic message to the connection with the given connection id.
   *
   * @param connectionId The connection id.
   * @param message The message to send.
   */
  public async sendBasicMessage(connectionId: string, message: string) {
    return this.agent.didcomm.basicMessages.sendMessage(connectionId, message)
  }
}
