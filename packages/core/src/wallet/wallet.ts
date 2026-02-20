import { AskarModule, type AskarModuleConfigStoreOptions } from '@credo-ts/askar'
import { Agent, utils } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/react-native'
import { askar } from '@openwallet-foundation/askar-react-native'

export const isWalletPinCorrect = async (storeConfig: AskarModuleConfigStoreOptions): Promise<boolean> => {
  const agent = new Agent({
    config: {
      autoUpdateStorageOnStartup: true,
    },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({ askar, store: storeConfig }),
    },
  })
  try {
    await agent.modules.askar.openStore()
    await agent.modules.askar.closeStore()
    return true
  } catch {
    return false
  }
}

// Tries importing into a temp store to verify backup integrity and passphrase correctness
export const isWalletImportable = async (
  storeConfig: AskarModuleConfigStoreOptions,
  importFromStore: AskarModuleConfigStoreOptions
): Promise<boolean> => {
  const tempStoreConfig: AskarModuleConfigStoreOptions = {
    id: `temp_import_check_${utils.uuid()}`,
    key: storeConfig.key,
    database: storeConfig.database,
  }
  const checkAgent = new Agent({
    config: {
      autoUpdateStorageOnStartup: true,
    },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({ askar, store: tempStoreConfig }),
    },
  })
  try {
    await checkAgent.modules.askar.importStore({ importFromStore })
    await checkAgent.modules.askar.openStore()
    await checkAgent.modules.askar.deleteStore()
    return true
  } catch {
    return false
  }
}

export const importWalletToStore = async (
  storeConfig: AskarModuleConfigStoreOptions,
  importFromStore: AskarModuleConfigStoreOptions
) => {
  const walletStoreConfig: AskarModuleConfigStoreOptions = {
    id: storeConfig.id,
    key: storeConfig.key,
    database: storeConfig.database,
  }
  const checkAgent = new Agent({
    config: {
      autoUpdateStorageOnStartup: true,
    },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({ askar, store: walletStoreConfig }),
    },
  })
  try {
    await checkAgent.modules.askar.importStore({ importFromStore })
    return true
  } catch {
    return false
  }
}
