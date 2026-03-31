import { RegisterCredentialsOptions } from '@animo-id/expo-digital-credentials-api'
import { DateOnly, Logger, MdocNameSpaces } from '@credo-ts/core'
import * as ExpoAsset from 'expo-asset'
import { Image } from 'expo-image'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { sanitizeString } from '../utils'

export type CredentialItem = RegisterCredentialsOptions['credentials'][number]
type CredentialDisplayClaim = NonNullable<CredentialItem['display']['claims']>[number]

export function mapMdocAttributes(namespaces: MdocNameSpaces) {
  return Object.fromEntries(
    Object.entries(namespaces).map(([namespace, values]) => [
      namespace,
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => {
          if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
            return [key, value]
          }
          if (value instanceof Date || value instanceof DateOnly) {
            return [key, value.toISOString()]
          }
          if (value instanceof Uint8Array) {
            return [key, `${value.byteLength} bytes`]
          }

          // For all other complex types we don't allow matching based on the value
          return [key, null]
        })
      ),
    ])
  )
}

export function mapMdocAttributesToClaimDisplay(namespaces: MdocNameSpaces) {
  return Object.entries(namespaces).flatMap(([namespace, values]) =>
    Object.keys(values).map((key) => ({
      path: [namespace, key],
      // FIXME: we need to integrate with claim based mapping of names.
      // For that we first need to:
      //  - use the claims arrays with path syntax in our Wallet instead of the custom mappings
      //  - support oid4vci draft 15 claim syntax
      displayName: sanitizeString(key),
    }))
  )
}

export function mapSdJwtAttributesToClaimDisplay(claims: object, path: string[] = []): CredentialDisplayClaim[] {
  return Object.entries(claims).flatMap(([claimName, value]) => {
    const nestedClaims =
      value && typeof value === 'object' && !Array.isArray(value)
        ? mapSdJwtAttributesToClaimDisplay(value, [...path, claimName])
        : []

    return [
      {
        path: [...path, claimName],
        // FIXME: we need to integrate with claim based mapping of names.
        // For that we first need to:
        //  - use the claims arrays with path syntax in our Wallet instead of the custom mappings
        //  - support oid4vci draft 15 claim syntax
        displayName: sanitizeString(claimName),
      },
      ...nestedClaims,
    ]
  })
}

export async function resizeImageWithAspectRatio(logger: Logger, asset: ExpoAsset.Asset) {
  try {
    // Make sure the asset is loaded
    if (!asset.localUri) {
      await asset.downloadAsync()
    }

    if (!asset.localUri) {
      return undefined
    }

    const image = await Image.loadAsync(asset.localUri)

    // Calculate new dimensions maintaining aspect ratio
    let width: number
    let height: number
    const MAX_SIZE = 128
    if (image.width >= image.height) {
      // If width is the larger dimension
      width = MAX_SIZE
      height = Math.round((image.height / image.width) * MAX_SIZE)
    } else {
      // If height is the larger dimension
      height = MAX_SIZE
      width = Math.round((image.width / image.height) * MAX_SIZE)
    }

    // Use the new API to resize the image
    const resizedImage = await ImageManipulator.manipulate(image).resize({ width, height }).renderAsync()
    const savedImages = await resizedImage.saveAsync({
      base64: true,
      format: SaveFormat.PNG,
      compress: 1,
    })

    if (!savedImages.base64) {
      return undefined
    }

    return `data:image/png;base64,${savedImages.base64}` as const
  } catch (error) {
    logger.error('Error resizing image.', {
      error,
    })
    throw error
  }
}

export async function loadCachedImageAsBase64DataUrl(logger: Logger, url: string) {
  let asset: ExpoAsset.Asset

  try {
    if (url.startsWith('data:')) {
      return url
    }
    if (url.startsWith('http')) {
      asset = await ExpoAsset.Asset.fromURI(url).downloadAsync()
    } else {
      asset = ExpoAsset.Asset.fromModule(url)
    }

    return await resizeImageWithAspectRatio(logger, asset)
  } catch (error) {
    logger.error('Error resizing and retrieving cached image for DC API', {
      error,
    })
  }
}
