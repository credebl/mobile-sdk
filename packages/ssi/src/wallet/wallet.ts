// NOTE: We need to import these to be able to use the AskarWallet in this file.
import '@hyperledger/aries-askar-react-native'

import type { InitConfig, WalletConfig, WalletExportImportConfig } from '@credo-ts/core'
import type { AgentModulesInput } from '@credo-ts/core/build/agent/AgentModules'

import { AskarWallet } from '@credo-ts/askar'
import {
  Agent,
  ConsoleLogger,
  HttpOutboundTransport,
  LogLevel,
  SigningProviderRegistry,
  WsOutboundTransport,
  utils,
} from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/react-native'

interface WalletImportConfigWithAgent {
  agentConfig: InitConfig
  importConfig: WalletExportImportConfig
  modules: AgentModulesInput
}

/**
 * Checks if the given wallet pin is correct by opening a custom wallet instance with the provided secret.
 *
 * @param walletConfig - The configuration object for the wallet.
 * @returns A Promise that resolves to a boolean indicating whether the wallet pin is correct or not.
 */
export const isWalletPinCorrect = async (walletConfig: WalletConfig) => {
  try {
    // NOTE: a custom wallet is used to check if the wallet key is correct. This is different from the wallet used in the rest of the app.
    // We create an AskarWallet instance and open the wallet with the given secret.
    const askarWallet = new AskarWallet(
      new ConsoleLogger(LogLevel.off),
      new agentDependencies.FileSystem(),
      new SigningProviderRegistry([])
    )
    await askarWallet.open(walletConfig)

    await askarWallet.close()
    return true
  } catch (e) {
    return false
  }
}

/**
 * Exports a wallet.
 *
 * @param agent The agent.
 * @param exportConfig The configuration for exporting the wallet.
 */
export const exportWallet = async (agent: Agent, exportConfig: WalletExportImportConfig) => {
  await agent.wallet.export(exportConfig)
}

/**
 * Checks if a wallet can be imported successfully with the given configuration.
 *
 * @param walletConfig The configuration for the wallet.
 * @param importConfig The configuration for importing the wallet.
 * @returns A Promise that resolves to a boolean indicating whether the wallet can be imported successfully.
 */
export const isWalletImportable = async (
  walletConfig: WalletConfig,
  importConfig: WalletExportImportConfig
): Promise<boolean> => {
  const fileSystem = new agentDependencies.FileSystem()
  const tempImportPath = `${fileSystem.tempPath}/${utils.uuid()}`
  try {
    // Add temp path to wallet config
    walletConfig.storage = {
      type: 'sqlite',
      path: tempImportPath,
    }
    // NOTE: a custom wallet is used to check if the wallet passphrase is correct and can be imported successfully.
    const askarWallet = new AskarWallet(new ConsoleLogger(LogLevel.debug), fileSystem, new SigningProviderRegistry([]))
    await askarWallet.import(walletConfig, importConfig)

    await fileSystem.delete(tempImportPath)
    return true
  } catch (e) {
    await fileSystem.delete(tempImportPath)
    return false
  }
}

/**
 * Imports a wallet with an agent.
 *
 * @param importConfig The configuration for importing the wallet.
 * @param agentConfig The configuration for the agent.
 * @param mediatorInvitationUrl The mediator invitation URL.
 * @param indyNetworks The Indy networks.
 * @returns The agent with the imported wallet.
 * @throws An error if the passphrase is invalid.
 */
export const importWalletWithAgent = async ({ importConfig, agentConfig, modules }: WalletImportConfigWithAgent) => {
  if (!agentConfig.walletConfig?.id || !agentConfig.walletConfig.key) {
    // Cannot find wallet id/key in agent config, so we cannot import the wallet
    return
  }

  if (!importConfig.key || !importConfig.path) {
    throw new Error('Please enter a valid passphrase')
  }

  const agent = new Agent({
    dependencies: agentDependencies,
    config: {
      autoUpdateStorageOnStartup: true,
      ...agentConfig,
    },
    modules,
  })

  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new WsOutboundTransport())

  await agent.wallet.import(agentConfig.walletConfig, importConfig)

  await agent.wallet.initialize(agentConfig.walletConfig)

  await agent.initialize()

  return agent
}
