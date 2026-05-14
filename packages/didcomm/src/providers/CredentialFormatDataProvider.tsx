import { recordsAddedByType, recordsRemovedByType, recordsUpdatedByType } from '@credebl/core'
import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'
import type { PropsWithChildren } from 'react'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DidCommAgent } from '../DidCommSdk'

type FormatReturn = Awaited<ReturnType<DidCommAgent['didcomm']['credentials']['getFormatData']>>

export type CredentialFormatData = FormatReturn & {
  id: string
}

type FormattedDataState = {
  formattedData: Array<CredentialFormatData>
  loading: boolean
}

const addRecord = (record: CredentialFormatData, state: FormattedDataState): FormattedDataState => {
  const newRecordsState = [...state.formattedData]
  newRecordsState.unshift(record)

  return {
    loading: state.loading,
    formattedData: newRecordsState,
  }
}

const updateRecord = (record: CredentialFormatData, state: FormattedDataState): FormattedDataState => {
  const newRecordsState = [...state.formattedData]
  const index = newRecordsState.findIndex((r) => r.id === record.id)

  if (index > -1) {
    newRecordsState[index] = record
  }

  return {
    loading: state.loading,
    formattedData: newRecordsState,
  }
}

const removeRecord = (recordId: string, state: FormattedDataState): FormattedDataState => {
  const newRecordsState = state.formattedData.filter((r) => r.id !== recordId)

  return {
    loading: state.loading,
    formattedData: newRecordsState,
  }
}

const CredentialFormatDataContext = createContext<FormattedDataState | undefined>(undefined)

export const useCredentialsFormatData = () => {
  const credentialFormatDataContext = useContext(CredentialFormatDataContext)

  if (!credentialFormatDataContext) {
    throw new Error('useCredentialFormatData must be used within a CredentialFormatDataContextProvider')
  }

  return credentialFormatDataContext
}

export const useCredentialFormatDataById = (id: string): CredentialFormatData | undefined => {
  const { formattedData } = useCredentialsFormatData()
  return formattedData.find((c) => c.id === id)
}

interface Props {
  agent: DidCommAgent
}

export const CredentialFormatDataProvider: React.FC<PropsWithChildren<Props>> = ({ agent, children }) => {
  const [state, setState] = useState<{
    formattedData: Array<CredentialFormatData>
    loading: boolean
  }>({
    formattedData: [],
    loading: true,
  })

  const fetchCredentialInformation = async (agent: DidCommAgent, record: DidCommCredentialExchangeRecord) => {
    const formatData = await agent.didcomm.credentials.getFormatData(record.id)

    return { ...formatData, id: record.id }
  }

  const setInitialState = useCallback(async () => {
    const records = await agent.didcomm.credentials.getAll()
    const formattedData: Array<CredentialFormatData> = []
    for (const record of records) {
      formattedData.push(await fetchCredentialInformation(agent, record))
    }
    setState({ formattedData, loading: false })
  }, [agent])

  useEffect(() => {
    void setInitialState()
  }, [setInitialState])

  useEffect(() => {
    if (state.loading) return

    const credentialAdded$ = recordsAddedByType(agent, DidCommCredentialExchangeRecord).subscribe(
      async (record: DidCommCredentialExchangeRecord) => {
        const formatData = await fetchCredentialInformation(agent, record)
        setState(addRecord(formatData, state))
      }
    )

    const credentialUpdate$ = recordsUpdatedByType(agent, DidCommCredentialExchangeRecord).subscribe(
      async (record: DidCommCredentialExchangeRecord) => {
        const formatData = await fetchCredentialInformation(agent, record)
        setState(updateRecord(formatData, state))
      }
    )

    const credentialRemove$ = recordsRemovedByType(agent, DidCommCredentialExchangeRecord).subscribe((record) =>
      setState(removeRecord(record.id, state))
    )

    return () => {
      credentialAdded$.unsubscribe()
      credentialUpdate$.unsubscribe()
      credentialRemove$.unsubscribe()
    }
  }, [state, agent])

  return <CredentialFormatDataContext.Provider value={state}>{children}</CredentialFormatDataContext.Provider>
}
