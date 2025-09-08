import { DateOnly, TypedArrayEncoder } from '@credo-ts/core'
import { formatDate, isDateString } from './date'

type MappedAttributesReturnType =
  | string
  | number
  | boolean
  | { [key: string]: MappedAttributesReturnType }
  | null
  | undefined
  | Array<MappedAttributesReturnType>

export function detectImageMimeType(data: Uint8Array): 'image/jpeg' | 'image/jp2' | null {
  // Check if array is too short to contain magic numbers
  if (data.length < 12) {
    return null
  }

  // JPEG starts with FF D8 FF
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg'
  }

  // JPEG2000 has two possible signatures:
  // 1) 00 00 00 0C 6A 50 20 20 0D 0A 87 0A
  // 2) FF 4F FF 51

  // Check first signature
  if (
    data[0] === 0x00 &&
    data[1] === 0x00 &&
    data[2] === 0x00 &&
    data[3] === 0x0c &&
    data[4] === 0x6a && // 'j'
    data[5] === 0x50 && // 'P'
    data[6] === 0x20 &&
    data[7] === 0x20 &&
    data[8] === 0x0d &&
    data[9] === 0x0a &&
    data[10] === 0x87 &&
    data[11] === 0x0a
  ) {
    return 'image/jp2'
  }

  // Check second signature
  if (data[0] === 0xff && data[1] === 0x4f && data[2] === 0xff && data[3] === 0x51) {
    return 'image/jp2'
  }

  return null
}

export function recursivelyMapMdocAttributes(value: unknown): MappedAttributesReturnType {
  if (value instanceof Uint8Array) {
    const imageMimeType = detectImageMimeType(value)
    if (imageMimeType) {
      return `data:${imageMimeType};base64,${TypedArrayEncoder.toBase64(value)}`
    }

    // TODO: what to do with a buffer that is not an image?
    return TypedArrayEncoder.toUtf8String(value)
  }
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value

  if (value instanceof Date || value instanceof DateOnly || (typeof value === 'string' && isDateString(value))) {
    return formatDate(value instanceof DateOnly ? value.toISOString() : value)
  }
  if (typeof value === 'string') return value
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([key, value]) => [key, recursivelyMapMdocAttributes(value)])
    )
  }
  if (Array.isArray(value)) return value.map(recursivelyMapMdocAttributes)

  return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, recursivelyMapMdocAttributes(value)]))
}
