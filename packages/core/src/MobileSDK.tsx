import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  CacheModule,
  DidsModule,
  type InitConfig,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidRegistrar,
  KeyDidResolver,
  SingleContextStorageLruCache,
} from '@credo-ts/core'
import type { AgentModulesInput } from '@credo-ts/core/build/agent/AgentModules'
import { agentDependencies } from '@credo-ts/react-native'
import { askar } from '@openwallet-foundation/askar-react-native'
import type { PropsWithChildren } from 'react'
import { useMobileSDK } from './contexts'
import AgentProvider from './providers/AgentProvider'

const getCoreModules = () => {
  return {
    askar: new AskarModule({
      askar,
    }),
    dids: new DidsModule({
      registrars: [new JwkDidRegistrar(), new KeyDidRegistrar()],
      resolvers: [new JwkDidResolver(), new KeyDidResolver()],
    }),
    cache: new CacheModule({
      cache: new SingleContextStorageLruCache({
        limit: 50,
      }),
    }),
  }
}

export interface MobileSDKModule {
  initialize(agent: Agent): void
  getAgentModules(): AgentModulesInput
}

export type MobileSDKOptions<T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>> = {
  agentConfig: InitConfig
  modules: T
  defaultModules?: AgentModulesInput
}

export class MobileSDK<T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>> {
  private localAgent: Agent | null = null
  public readonly configuration: MobileSDKOptions<T>
  public readonly modules: T

  public constructor(options: MobileSDKOptions<T>) {
    this.configuration = options
    this.modules = options.modules
  }

  public async initialize() {
    const defaultModules = this.configuration.defaultModules ?? {}
    const coreModules = getCoreModules()
    Object.assign(defaultModules, coreModules)

    const modules = Object.entries(this.configuration.modules).reduce((acc, [, module]) => {
      const moduleModules = module.getAgentModules()
      Object.assign(acc, moduleModules)
      return acc
    }, defaultModules)

    const agent = new Agent({
      config: this.configuration.agentConfig,
      dependencies: agentDependencies,
      modules,
    })
    await agent.initialize()

    // Initialize modules after agent is initialized to ensure all dependencies are available
    for await (const [, module] of Object.entries(this.configuration.modules)) {
      module.initialize(agent)
    }

    this.localAgent = agent
    return agent
  }

  public get agent() {
    return this.localAgent
  }

  public assertAndGetAgent() {
    if (!this.agent) {
      throw new Error('Agent not initialized')
    }

    return this.agent
  }

  public static AppProvider({ children }: PropsWithChildren) {
    const { sdk } = useMobileSDK()

    if (!sdk?.agent) {
      throw new Error('Mobile SDK not initialized')
    }

    return <AgentProvider agent={sdk.agent}>{children}</AgentProvider>
  }
}
