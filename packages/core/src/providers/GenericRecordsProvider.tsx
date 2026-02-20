import { type Agent, GenericRecord, type TagValue } from '@credo-ts/core'
import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { recordsAddedByType, recordsRemovedByType, recordsUpdatedByType } from './recordUtils'

export { GenericRecord } from '@credo-ts/core'

type GenericRecordState = {
  genericRecords: Array<GenericRecord>
  isLoading: boolean
}

const addRecord = (record: GenericRecord, state: GenericRecordState): GenericRecordState => {
  const newRecordsState = [...state.genericRecords]
  newRecordsState.unshift(record)
  return {
    isLoading: state.isLoading,
    genericRecords: newRecordsState,
  }
}

const updateRecord = (record: GenericRecord, state: GenericRecordState): GenericRecordState => {
  const newRecordsState = [...state.genericRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState[index] = record
  }
  return {
    isLoading: state.isLoading,
    genericRecords: newRecordsState,
  }
}

const removeRecord = (record: GenericRecord, state: GenericRecordState): GenericRecordState => {
  const newRecordsState = state.genericRecords.filter((r) => r.id !== record.id)
  return {
    isLoading: state.isLoading,
    genericRecords: newRecordsState,
  }
}

const GenericRecordContext = createContext<GenericRecordState | undefined>(undefined)

export type UseGenericRecordOptions = {
  /** Filter records that have this tag key present (non-null/undefined value) */
  filterByTagKey?: string
  /** Filter records matching ALL specified tag key-value pairs */
  filterByTags?: Record<string, TagValue>
}

export const useGenericRecords = (options: UseGenericRecordOptions = {}): GenericRecordState => {
  const genericRecordContext = useContext(GenericRecordContext)
  if (!genericRecordContext) {
    throw new Error('useGenericRecord must be used within a GenericRecordContextProvider')
  }

  const genericRecords = useMemo(() => {
    const { filterByTagKey, filterByTags } = options

    // Skip filter loop when no options are provided
    if (!filterByTagKey && !filterByTags) return genericRecordContext.genericRecords

    return genericRecordContext.genericRecords.filter((record: GenericRecord) => {
      // Filter by tag key presence
      if (filterByTagKey !== undefined) {
        const tagValue = record.getTag(filterByTagKey)
        if (tagValue === undefined || tagValue === null) return false
      }

      // Filter by tag key+value pairs (all must match)
      if (filterByTags !== undefined) {
        for (const [key, value] of Object.entries(filterByTags)) {
          if (record.getTag(key) !== value) return false
        }
      }

      return true
    })
  }, [genericRecordContext.genericRecords, options.filterByTagKey, options.filterByTags])

  return { ...genericRecordContext, genericRecords }
}

export const useGenericRecordById = (id: string): GenericRecord | undefined => {
  const { genericRecords } = useGenericRecords()
  return genericRecords.find((c) => c.id === id)
}

interface Props {
  agent: Agent
}

export const GenericRecordProvider: React.FC<PropsWithChildren<Props>> = ({ agent, children }) => {
  const [state, setState] = useState<GenericRecordState>({
    genericRecords: [],
    isLoading: true,
  })

  useEffect(() => {
    void agent.genericRecords.getAll().then((genericRecords) => setState({ genericRecords, isLoading: false }))
  }, [agent])

  useEffect(() => {
    if (!state.isLoading && agent) {
      const genericRecordAdded$ = recordsAddedByType(agent, GenericRecord).subscribe((record) =>
        setState(addRecord(record, state))
      )

      const genericRecordUpdate$ = recordsUpdatedByType(agent, GenericRecord).subscribe((record) =>
        setState(updateRecord(record, state))
      )

      const genericRecordRemove$ = recordsRemovedByType(agent, GenericRecord).subscribe((record) =>
        setState(removeRecord(record, state))
      )

      return () => {
        genericRecordAdded$.unsubscribe()
        genericRecordUpdate$.unsubscribe()
        genericRecordRemove$.unsubscribe()
      }
    }
  }, [state, agent])

  return <GenericRecordContext.Provider value={state}>{children}</GenericRecordContext.Provider>
}
