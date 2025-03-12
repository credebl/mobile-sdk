import type {
  Agent,
  AgentMessage,
  ConnectionInvitationMessage,
  CreateLegacyInvitationConfig,
  CreateOutOfBandInvitationConfig,
  OutOfBandInvitation,
  ReceiveOutOfBandInvitationConfig,
  Routing,
} from '@credo-ts/core'

/**
 * Creates an invitation with RFC 0160: Connection Protocol and returns it together with out-of-band record and invitationUrl.
 *
 * @param agent agent instance
 * @param domain domain of the agent
 * @param config configuration of how a connection invitation should be created
 * @returns out-of-band record and connection invitation together with invitationUrl
 */
export const createLegacyInvitation = async (agent: Agent, domain: string, config?: CreateLegacyInvitationConfig) => {
  const record = await agent.oob.createLegacyInvitation(config)

  const invitationUrl = record.invitation.toUrl({ domain })

  return {
    record,
    invitation: record.invitation,
    invitationUrl,
  }
}

/**
 * Creates a legacy connectionless invitation using the provided configuration.
 *
 * @param agent - The agent instance to use for creating the invitation.
 * @param config - The configuration object for creating the invitation.
 * @param config.recordId - Optional record ID for the invitation.
 * @param config.message - The agent message to include in the invitation.
 * @param config.domain - The domain to use for the invitation.
 * @param config.routing - Optional routing information for the invitation.
 *
 * @returns A Promise that resolves to the created invitation.
 */
export const createLegacyConnectionlessInvitation = async (
  agent: Agent,
  config: {
    recordId?: string | undefined
    message: AgentMessage
    domain: string
    routing?: Routing | undefined
  }
) => {
  return agent.oob.createLegacyConnectionlessInvitation(config)
}

/**
 * Creates an out-of-band invitation for establishing a connection with another agent.
 *
 * @param agent The agent instance to use for creating the invitation.
 * @param domain The domain to use for the invitation URL.
 * @param config Optional configuration for the invitation.
 * @returns An object containing the invitation record, the invitation object, and the invitation URL.
 */
export const createInvitation = async (agent: Agent, domain: string, config?: CreateOutOfBandInvitationConfig) => {
  const record = await agent.oob.createInvitation(config)

  const invitationUrl = record.outOfBandInvitation.toUrl({ domain })

  return {
    record,
    invitation: record.outOfBandInvitation,
    invitationUrl,
  }
}

/**
 * Accepts a connection invitation message or out-of-band invitation and returns the connection record.
 *
 * @param agent The agent instance to use for accepting the invitation.
 * @param invitation The connection invitation message or out-of-band invitation to accept.
 * @param config Optional configuration for receiving out-of-band invitations.
 *
 * @returns The connection record.
 */
export const acceptInvitation = async (
  agent: Agent,
  invitation: ConnectionInvitationMessage | OutOfBandInvitation,
  config?: ReceiveOutOfBandInvitationConfig
) => {
  const record = await agent.oob.receiveInvitation(invitation, config)

  return record
}

/**
 * Parses an invitation from a URL using the Adeya agent.
 *
 * @param agent The agent instance to use for parsing the invitation.
 * @param invitationUrl The URL of the invitation to parse.
 * @returns A Promise that resolves with the parsed invitation.
 */
export const parseInvitationFromUrl = async (agent: Agent, invitationUrl: string) => {
  return agent.oob.parseInvitation(invitationUrl)
}

/**
 * Accepts a connection invitation from a URL.
 *
 * @param agent The agent instance to use for accepting the invitation.
 * @param invitationUrl The URL of the connection invitation.
 * @param config Optional configuration for receiving the out-of-band invitation.
 * @returns A Promise that resolves to the connection record and out of band record.
 * @throws An error if the invitation cannot be parsed from the URL or if the connection does not have an ID.
 */
export const acceptInvitationFromUrl = async (
  agent: Agent,
  invitationUrl: string,
  config?: ReceiveOutOfBandInvitationConfig
) => {
  const invitation = await agent.oob.parseInvitation(invitationUrl)

  if (!invitation) {
    throw new Error('Could not parse invitation from URL')
  }

  const record = await agent.oob.receiveInvitation(invitation, config)
  const connectionRecord = record?.connectionRecord
  if (!connectionRecord?.id) {
    throw new Error('Connection does not have an ID')
  }

  return record
}

/**
 * Returns all connections from the agent.
 *
 * @param agent The agent instance to use for retrieving the connections.
 * @returns A promise that resolves to an array of Connection objects.
 */
export const getAllConnections = async (agent: Agent) => {
  return agent.connections.getAll()
}

/**
 * Retrieves a connection record by connectionId.
 *
 * @param agent The agent instance to use for retrieving the connection.
 * @param connectionId The ID of the connection to retrieve.
 * @returns A Promise that resolves to the connection object.
 */
export const getConnectionById = async (agent: Agent, connectionId: string) => {
  return agent.connections.getById(connectionId)
}

/**
 * Finds a connection record by its ID.
 *
 * @param agent The agent instance to use for finding the connection.
 * @param connectionId The ID of the connection to find.
 * @returns A Promise that resolves with the connection object, or null if not found.
 */
export const findConnectionById = async (agent: Agent, connectionId: string) => {
  return await agent.connections.findById(connectionId)
}

/**
 * Finds an out-of-band record by its connection ID.
 *
 * @param agent The agent instance to use for finding the out-of-band record.
 * @param connectionId The ID of the connection to find.
 * @returns A Promise that resolves to the out-of-band record with the given ID.
 */
export const findOutOfBandRecordById = async (agent: Agent, connectionId: string) => {
  return agent.oob.findById(connectionId)
}

/**
 * Finds an out-of-band record by its invitation ID.
 *
 * @param agent The agent instance to use for finding the out-of-band record.
 * @param receivedInvitationId The ID of the invitation to find.
 * @returns A Promise that resolves to the out-of-band record with the given ID.
 */
export const findByReceivedInvitationId = async (agent: Agent, receivedInvitationId: string) => {
  return agent.oob.findByReceivedInvitationId(receivedInvitationId)
}

/**
 * Deletes a connection record by its ID.
 *
 * @param connectionId The ID of the connection to be deleted.
 * @returns A boolean indicating whether the connection was successfully deleted or not.
 */
export const deleteConnectionRecordById = async (agent: Agent, connectionId: string) => {
  await agent.connections.deleteById(connectionId)
  return true
}

/**
 * Deletes an out-of-band record by its ID.
 *
 * @param outOfBandId The ID of the out-of-band record to be deleted.
 * @returns A boolean indicating whether the out-of-band record was successfully deleted or not.
 */
export const deleteOobRecordById = async (agent: Agent, outOfBandId: string) => {
  await agent.oob.deleteById(outOfBandId)
  return true
}
