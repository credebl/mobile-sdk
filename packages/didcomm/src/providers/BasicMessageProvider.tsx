import {
  addRecord,
  RecordsState,
  recordsAddedByType,
  recordsRemovedByType,
  recordsUpdatedByType,
  removeRecord,
  updateRecord,
} from '@credebl/core'
import type { Agent } from '@credo-ts/core'
import { DidCommBasicMessageRecord } from '@credo-ts/didcomm'
import type { PropsWithChildren } from 'react'
import * as React from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const BasicMessageContext = createContext<RecordsState<DidCommBasicMessageRecord> | undefined>(undefined)

export const useBasicMessages = () => {
  const basicMessageContext = useContext(BasicMessageContext)
  if (!basicMessageContext) {
    throw new Error('useBasicMessages must be used within a BasicMessageContextProvider')
  }
  return basicMessageContext
}

export const useBasicMessagesByConnectionId = (connectionId: string): DidCommBasicMessageRecord[] => {
  const { records: basicMessages } = useBasicMessages()

  const messages = useMemo(
    () => basicMessages.filter((m) => m.connectionId === connectionId),
    [basicMessages, connectionId]
  )

  return messages
}

interface Props {
  agent: Agent
}

export const BasicMessageProvider: React.FC<PropsWithChildren<Props>> = ({ agent, children }) => {
  const [state, setState] = useState<RecordsState<DidCommBasicMessageRecord>>({
    records: [],
    loading: true,
  })

  const setInitialState = async () => {
    const records = await agent.modules.basicMessages.findAllByQuery({})
    setState({ records, loading: false })
  }

  useEffect(() => {
    setInitialState()
  }, [agent])

  useEffect(() => {
    if (state.loading) return

    const basicMessageAdded$ = recordsAddedByType(agent, DidCommBasicMessageRecord).subscribe((record) =>
      setState(addRecord(record, state))
    )

    const basicMessageUpdated$ = recordsUpdatedByType(agent, DidCommBasicMessageRecord).subscribe((record) =>
      setState(updateRecord(record, state))
    )

    const basicMessageRemoved$ = recordsRemovedByType(agent, DidCommBasicMessageRecord).subscribe((record) =>
      setState(removeRecord(record, state))
    )

    return () => {
      basicMessageAdded$?.unsubscribe()
      basicMessageUpdated$?.unsubscribe()
      basicMessageRemoved$?.unsubscribe()
    }
  }, [state, agent])

  return <BasicMessageContext.Provider value={state}>{children}</BasicMessageContext.Provider>
}
