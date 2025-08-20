# Mobile SDK Core - React Context Integration

This package provides React context integration for the MobileSDK, allowing you to access the SDK instance globally throughout your React application.

## Features

- **Global SDK Access**: Access the MobileSDK instance from any component
- **Type Safety**: Full TypeScript support with proper typing
- **State Management**: Built-in state management for SDK initialization
- **React Integration**: Follows React best practices and patterns

## Installation

```bash
npm install @credebl/mobile-sdk-core
# or
yarn add @credebl/mobile-sdk-core
# or
pnpm add @credebl/mobile-sdk-core
```

## Quick Start

### 1. Wrap your app with the SDKProvider

```tsx
import { SDKProvider } from '@credebl/mobile-sdk-core';

function App() {
  return (
    <SDKProvider>
      {/* Your app components */}
    </SDKProvider>
  );
}
```

### 2. Initialize the SDK in a component

```tsx
import { useSDKInitializer } from '@credebl/mobile-sdk-core';

function AppInitializer() {
  const { initializeSDK, isInitialized } = useSDKInitializer();

  useEffect(() => {
    if (!isInitialized) {
      initializeSDK();
    }
  }, [initializeSDK, isInitialized]);

  return null; // This component doesn't render anything
}
```

### 3. Use the SDK anywhere in your app

```tsx
import { useSDK } from '@credebl/mobile-sdk-core';

function SomeComponent() {
  const { sdk, isInitialized } = useSDK();
  
  if (!isInitialized || !sdk) {
    return <div>SDK not initialized</div>;
  }
  
  const handleAction = () => {
    // Use sdk methods here
    console.log('SDK is ready:', sdk);
  };
  
  return <button onClick={handleAction}>Perform Action</button>;
}
```

## API Reference

### SDKProvider

The main context provider that wraps your app and provides the SDK context.

**Props:**
- `children`: React nodes to be wrapped by the provider

### useSDK

Hook to access the SDK context. Must be used within an SDKProvider.

**Returns:**
- `sdk`: The MobileSDK instance or null if not initialized
- `setSDK`: Function to set the SDK instance
- `isInitialized`: Boolean indicating if the SDK is initialized

### useSDKInitializer

Hook to handle SDK initialization logic.

**Returns:**
- `initializeSDK`: Function to initialize the SDK
- `isInitialized`: Boolean indicating if the SDK is initialized

## Example Implementation

Here's a complete example of how to set up and use the SDK context:

```tsx
import React, { useEffect } from 'react';
import { SDKProvider, useSDK, useSDKInitializer } from '@credebl/mobile-sdk-core';

// Component to initialize the SDK
function SDKInitializer() {
  const { initializeSDK, isInitialized } = useSDKInitializer();

  useEffect(() => {
    if (!isInitialized) {
      initializeSDK();
    }
  }, [initializeSDK, isInitialized]);

  return null;
}

// Component that uses the SDK
function SDKUser() {
  const { sdk, isInitialized } = useSDK();

  if (!isInitialized || !sdk) {
    return <div>Loading SDK...</div>;
  }

  return (
    <div>
      <h2>SDK Ready!</h2>
      <p>SDK instance: {sdk.constructor.name}</p>
    </div>
  );
}

// Main app component
function App() {
  return (
    <SDKProvider>
      <SDKInitializer />
      <SDKUser />
    </SDKProvider>
  );
}

export default App;
```

## Error Handling

The `useSDK` hook will throw an error if used outside of an SDKProvider:

```tsx
function ComponentOutsideProvider() {
  try {
    const { sdk } = useSDK(); // This will throw an error
  } catch (error) {
    console.error('SDK context not available:', error.message);
  }
}
```

## Best Practices

1. **Initialize Early**: Initialize the SDK as early as possible in your app lifecycle
2. **Error Boundaries**: Wrap your app with error boundaries to handle SDK initialization errors
3. **Loading States**: Always check `isInitialized` before using the SDK
4. **Type Safety**: Use TypeScript for better development experience and error catching

## Troubleshooting

### Common Issues

1. **"useSDK must be used within an SDKProvider"**
   - Ensure your component is wrapped with SDKProvider
   - Check that the provider is imported correctly

2. **SDK not initializing**
   - Verify that `initializeSDK()` is being called
   - Check browser console for any errors
   - Ensure all required dependencies are installed

3. **Type errors**
   - Make sure you're using TypeScript
   - Check that all imports are correct
   - Verify that the MobileSDK class is properly exported

## Contributing

This package is part of the CredeBL Mobile SDK ecosystem. For contributions, please refer to the main project documentation.
