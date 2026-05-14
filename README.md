# CREDEBL Mobile SDK

A React Native SDK for adding **Self-Sovereign Identity (SSI)** capabilities to your app — letting users hold, present, and exchange verifiable digital credentials without relying on a central authority.

> **What is SSI?** Think of it like a digital wallet for verified documents. Instead of a company storing your data on a server, you hold your own credentials (e.g. a government-issued ID or a university diploma) on your phone and share only what's needed — with no middleman.

## Packages

| Package | Description | Version |
|---|---|---|
| [`@credebl/ssi-mobile-core`](./packages/core/README.md) | Core SDK — wallet setup, DID operations, credential storage, key management | [![npm](https://img.shields.io/npm/v/@credebl/ssi-mobile-core.svg)](https://npmjs.com/package/@credebl/ssi-mobile-core) |
| [`@credebl/ssi-mobile-didcomm`](./packages/didcomm/README.md) | DIDComm protocol — connections, credentials, proofs, messaging | [![npm](https://img.shields.io/npm/v/@credebl/ssi-mobile-didcomm.svg)](https://npmjs.com/package/@credebl/ssi-mobile-didcomm) |
| [`@credebl/ssi-mobile-openid4vc`](./packages/openid4vc/README.md) | OpenID4VC — credential issuance and presentation via QR/deep link | [![npm](https://img.shields.io/npm/v/@credebl/ssi-mobile-openid4vc.svg)](https://npmjs.com/package/@credebl/ssi-mobile-openid4vc) |

---

## Prerequisites

### React Native CLI

- Node.js >= 20
- React Native >= 0.76
- Xcode (for iOS builds)
- Android Studio (for Android builds)

### Expo

> **Expo Go is not supported.** These packages use native modules that cannot run in Expo Go.

Use one of:
- **Bare workflow** — run `npx expo prebuild` then `pod install`
- **EAS Build** — run `eas build` for cloud builds

---

## Installation

### Step 1 — Install the core package

```bash
npm install @credebl/ssi-mobile-core
# or
yarn add @credebl/ssi-mobile-core
```

### Step 2 — Install the required native peer dependency

```bash
npm install @openwallet-foundation/askar-react-native
# or
yarn add @openwallet-foundation/askar-react-native
```

### Step 3 — iOS: install pods

```bash
cd ios && pod install
```

> **Note:** If you see a build error on iOS, make sure your minimum deployment target is 13.0 or higher in your `Podfile`:
> ```ruby
> platform :ios, '13.0'
> ```

### Step 4 — Android: check gradle config

In `android/app/build.gradle`, ensure `minSdkVersion` is at least 24:

```groovy
android {
  defaultConfig {
    minSdkVersion 24
  }
}
```

### Expo bare workflow

After installing packages, run:

```bash
npx expo prebuild
cd ios && pod install  # iOS only
```

---

## Quick Start

### Level 1 — Core only (wallet + DID operations)

Wrap your app root with `MobileSDKProvider`, then initialize the SDK on startup.

```tsx
// App.tsx
import { MobileSDKProvider } from '@credebl/ssi-mobile-core'
import { AppInitializer } from './AppInitializer'

export default function App() {
  return (
    <MobileSDKProvider>
      <AppInitializer />
      {/* rest of your app */}
    </MobileSDKProvider>
  )
}
```

```tsx
// AppInitializer.tsx
import { useEffect } from 'react'
import { useMobileSDKInitializer, ConsoleLogger, LogLevel } from '@credebl/ssi-mobile-core'

export function AppInitializer() {
  const { initializeSDK, isInitialized } = useMobileSDKInitializer()

  useEffect(() => {
    if (!isInitialized) {
      initializeSDK({
        agentConfig: {
          label: 'My Wallet',
          logger: new ConsoleLogger(LogLevel.debug),
        },
        askarConfig: {
          id: 'my-wallet-id',
          key: 'my-wallet-key',
        },
        modules: {},
      })
    }
  }, [isInitialized])

  return null
}
```

Access the SDK from any component:

```tsx
import { useMobileSDK } from '@credebl/ssi-mobile-core'

function MyComponent() {
  const { sdk, isInitialized } = useMobileSDK()

  if (!isInitialized || !sdk) return null

  const handleCreateDid = async () => {
    const didRecord = await sdk.createDid({ method: 'key' })
    console.log('Created DID:', didRecord)
  }

  return <Button title="Create DID" onPress={handleCreateDid} />
}
```

---

### Level 2 — Add DIDComm (connections, credentials, proofs)

DIDComm lets your wallet connect to issuers, receive credential offers, and respond to proof requests.

**Install additional packages:**

```bash
npm install @credebl/ssi-mobile-didcomm @hyperledger/anoncreds-react-native @hyperledger/indy-vdr-react-native
# or
yarn add @credebl/ssi-mobile-didcomm @hyperledger/anoncreds-react-native @hyperledger/indy-vdr-react-native
```

**iOS — install pods:**

```bash
cd ios && pod install
```

**Configure and initialize:**

```tsx
// config.ts
import { MobileSDKOptions, ConsoleLogger, LogLevel } from '@credebl/ssi-mobile-core'
import { DidCommSDK, DidCommMediatorPickupStrategy } from '@credebl/ssi-mobile-didcomm'

type AppModules = { didcomm: DidCommSDK }

export function createConfig(walletId: string, walletKey: string): MobileSDKOptions<AppModules> {
  return {
    agentConfig: {
      label: 'My Wallet',
      logger: new ConsoleLogger(LogLevel.debug),
    },
    askarConfig: {
      id: walletId,
      key: walletKey,
    },
    modules: {
      didcomm: new DidCommSDK({
        peerNumAlgoForDidExchangeRequests: 1,
        peerNumAlgoForDidRotation: 4,
        processDidCommMessagesConcurrently: false,
        mediatorPickupStrategy: DidCommMediatorPickupStrategy.PickUpV2LiveMode,
      }),
    },
  }
}
```

**Add the DIDComm provider:**

```tsx
// App.tsx
import { MobileSDKProvider, MobileSDK, useMobileSDK } from '@credebl/ssi-mobile-core'
import { DidCommSDK } from '@credebl/ssi-mobile-didcomm'

type AppModules = { didcomm: DidCommSDK }

function SDKProviders({ children }: { children: React.ReactNode }) {
  const { sdk } = useMobileSDK<AppModules>()
  if (!sdk?.agent) return null
  return (
    <DidCommSDK.DidCommProvider agent={sdk.agent}>
      {children}
    </DidCommSDK.DidCommProvider>
  )
}

export default function App() {
  return (
    <MobileSDKProvider>
      <MobileSDK.AppProvider>
        <SDKProviders>
          {/* your app */}
        </SDKProviders>
      </MobileSDK.AppProvider>
    </MobileSDKProvider>
  )
}
```

**Use DIDComm features:**

```tsx
import { useMobileSDK } from '@credebl/ssi-mobile-core'
import { DidCommSDK } from '@credebl/ssi-mobile-didcomm'

type AppModules = { didcomm: DidCommSDK }

function ConnectScreen() {
  const { sdk } = useMobileSDK<AppModules>()

  const handleScan = async (invitationUrl: string) => {
    // Accept a connection invitation scanned from a QR code
    const oobRecord = await sdk.modules.didcomm.connections.acceptInvitationFromUrl(
      invitationUrl,
      { label: 'My Wallet' }
    )
    console.log('Connected!', oobRecord)
  }

  return <QRScanner onScan={handleScan} />
}
```

See the [`@credebl/ssi-mobile-didcomm` README](./packages/didcomm/README.md) for the full API reference.

---

### Level 3 — Add OpenID4VC (credential issuance via QR / deep link)

OpenID4VC lets users receive credentials from web-based issuers by scanning a QR code or following a deep link.

```bash
npm install @credebl/ssi-mobile-openid4vc
# or
yarn add @credebl/ssi-mobile-openid4vc
```

See the [`@credebl/ssi-mobile-openid4vc` README](./packages/openid4vc/README.md) for setup and API reference.

---

## Further Reading

- [`@credebl/ssi-mobile-core` — full API reference](./packages/core/README.md)
- [`@credebl/ssi-mobile-didcomm` — full API reference](./packages/didcomm/README.md)
