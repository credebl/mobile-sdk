import type { Agent, Query } from '@credo-ts/core'
import type {
  GenericRecord,
  SaveGenericRecordOption,
} from '@credo-ts/core/build/modules/generic-records/repository/GenericRecord'

/**
 * Retrieves all credential exchange records from the agent.
 *
 * @param agent The agent instance to use for retrieving the credential exchange records.
 * @returns A promise that resolves to an array of credential exchange records.
 */
export const addWalletRecord = async (agent: Agent, options: SaveGenericRecordOption) => {
  return agent.genericRecords.save(options)
}

/**
 * Retrieves the generic record for a given record ID.
 * @param agent The agent instance to use for retrieving the generic record.
 * @param id The ID of the generic record to retrieve.
 * @returns A Promise that resolves with the generic record for the given ID.
 */
export const findWalletRecordById = async (agent: Agent, id: string) => {
  return agent.genericRecords.findById(id)
}

/**
 * Retrieves all generic records from the agent.
 *
 * @param agent The agent instance to use for retrieving the generic records.
 * @returns A promise that resolves to an array of generic records.
 */
export const getAllWalletRecords = async (agent: Agent) => {
  return agent.genericRecords.getAll()
}

/**
 * Updates a generic record.
 *
 * @param agent The agent instance to use for updating the generic record.
 * @param record The generic record to update.
 * @returns A promise that resolves with the updated generic record.
 */
export const updateWalletRecord = async (agent: Agent, record: GenericRecord) => {
  return agent.genericRecords.update(record)
}

/**
 * Deletes a generic record.
 *
 * @param agent The agent instance to use for deleting the generic record.
 * @param record The generic record to delete.
 * @returns A promise that resolves with the deleted generic record.
 */
export const deleteWalletRecord = async (agent: Agent, record: GenericRecord) => {
  return agent.genericRecords.delete(record)
}

/**
 * Deletes a generic record by ID.
 *
 * @param agent The agent instance to use for deleting the generic record.
 * @param id The ID of the generic record to delete.
 * @returns A promise that resolves with the deleted generic record.
 */
export const deleteWalletRecordById = async (agent: Agent, id: string) => {
  return agent.genericRecords.deleteById(id)
}

/**
 * Retrieves all generic records from the agent that match the given query.
 *
 * @param agent The agent instance to use for retrieving the generic records.
 * @param query The query to use for retrieving the generic records.
 * @returns A promise that resolves to an array of generic records.
 */
export const findWalletRecordsByQuery = async (agent: Agent, query: Query<GenericRecord>) => {
  return agent.genericRecords.findAllByQuery(query)
}
