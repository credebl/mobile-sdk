import type { Agent } from '@credo-ts/core'
import type { PropsWithChildren } from 'react'

import { createContext, useContext } from 'react'
import { W3cCredentialRecordProvider } from './W3cCredentialsProvider'

const AgentContext = createContext<Agent | undefined>(undefined)

export const useAgent = <_AppAgent extends Agent = Agent>() => {
  const agentContext = useContext(AgentContext)
  if (!agentContext) {
    throw new Error('useAgent must be used within a AgentContextProvider')
  }
  return {
    agent: agentContext,
  }
}

interface Props {
  agent: Agent
}

const AgentProvider: React.FC<PropsWithChildren<Props>> = ({ agent, children }) => {
  return (
    <AgentContext.Provider value={agent}>
      <W3cCredentialRecordProvider agent={agent}>{children}</W3cCredentialRecordProvider>
    </AgentContext.Provider>
  )
}

export default AgentProvider
