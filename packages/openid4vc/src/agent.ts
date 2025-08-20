import { AskarModule } from '@credo-ts/askar'
import type { DidRegistrar, DidResolver, InitConfig } from '@credo-ts/core'
import { Agent, DidsModule, KeyDidRegistrar, KeyDidResolver, WebDidResolver } from '@credo-ts/core'
import type { AgentModulesInput } from '@credo-ts/core/build/agent/AgentModules'
import { agentDependencies } from '@credo-ts/react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'

export type CredeblAgentCoreModuleOptions = {
  didOptions: {
    registrar: DidRegistrar[] | undefined
    resolver: DidResolver[] | undefined
  }
}

export const getAgentCoreModules = (options: CredeblAgentCoreModuleOptions) => {
  return {
    askar: new AskarModule({
      ariesAskar,
    }),
    dids: new DidsModule({
      registrars: [new KeyDidRegistrar(), ...(options.didOptions.registrar ?? [])],
      resolvers: [new WebDidResolver(), new KeyDidResolver(), ...(options.didOptions.resolver ?? [])],
    }),
  }
}

export const createAgentInstance = async ({
  config,
  modules,
}: {
  config: InitConfig
  modules: AgentModulesInput
}) => {
  const initConfig: InitConfig = {
    autoUpdateStorageOnStartup: true,
    ...config,
  }

  const agent = new Agent({
    dependencies: agentDependencies,
    config: initConfig,
    modules,
  })

  return agent
}
