import type { Agent } from '@credo-ts/core'
import type { PropsWithChildren } from 'react'

import { createContext, useContext, useState } from 'react'

interface AgentContextInterface<AppAgent extends Agent = Agent> {
  agent: AppAgent
}

const AgentContext = createContext<AgentContextInterface | undefined>(undefined)

export const useAgent = <AppAgent extends Agent>() => {
  const agentContext = useContext(AgentContext)
  if (!agentContext) {
    throw new Error('useAgent must be used within a AgentContextProvider')
  }
  return agentContext as AgentContextInterface<AppAgent>
}

interface Props {
  agent: Agent
}

const AgentProvider: React.FC<PropsWithChildren<Props>> = ({ agent, children }) => {
  const [agentState] = useState<AgentContextInterface>({
    agent,
  })

  return <AgentContext.Provider value={agentState}>{children}</AgentContext.Provider>
}

export default AgentProvider
