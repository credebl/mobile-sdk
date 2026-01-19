import type { AdeyaAgent } from '../agent'

/**
 * Sends a basic message to the connection with the given connection id.
 *
 * @param agent The agent instance .
 * @param connectionId The connection id.
 * @param message The message to send.
 */
export const sendBasicMessage = async (agent: AdeyaAgent, connectionId: string, message: string) => {
  return agent.modules.basicMessages.sendMessage(connectionId, message)
}
