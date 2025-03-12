import { createHash } from 'node:crypto'
import axios from 'axios'

import {
  DIGILOCKER_AADHAAR,
  DIGILOCKER_CLIENT_ID_URL_1,
  DIGILOCKER_CODE_CHALLENGE_METHOD_URL_4,
  DIGILOCKER_CODE_CHALLENGE_URL_3,
  DIGILOCKER_FETCH_DOCUMENT,
  DIGILOCKER_FETCH_FILE,
  DIGILOCKER_ISSUE_DOCUMENT,
  DIGILOCKER_REDIRECT_URL_2,
  DIGILOCKER_TOKEN_URL,
} from './constant'

export type AdeyaDigiLockerModuleOptions = {
  client_id?: string | undefined
  client_secret?: string | undefined
  redirect_url?: string | undefined
  authCode?: string | undefined
  codeVerifier?: string | undefined
}

export const base64UrlEncodeWithoutPadding = (input: Buffer): string => {
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export const generateCodeChallenge = (codeVerifier: string): string => {
  const hash = createHash('sha256').update(codeVerifier).digest()
  return base64UrlEncodeWithoutPadding(hash)
}

export const initiateDigiLockerOAuth = async ({
  client_id = '',
  redirect_url = '',
  codeVerifier = '',
}: AdeyaDigiLockerModuleOptions) => {
  try {
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const authUrl = `${DIGILOCKER_CLIENT_ID_URL_1}${client_id}${DIGILOCKER_REDIRECT_URL_2}${redirect_url}${DIGILOCKER_CODE_CHALLENGE_URL_3}${codeChallenge}${DIGILOCKER_CODE_CHALLENGE_METHOD_URL_4}`
    return authUrl
  } catch (error) {
    return error instanceof Error ? error : new Error('An unknown error occurred')
  }
}

export const fetchDigiLockerToken = async ({
  authCode = '',
  client_id = '',
  client_secret = '',
  redirect_url = '',
  codeVerifier = '',
}: AdeyaDigiLockerModuleOptions) => {
  const params = `grant_type=authorization_code&code=${encodeURIComponent(authCode)}&client_id=${encodeURIComponent(client_id)}&client_secret=${encodeURIComponent(client_secret)}&redirect_uri=${encodeURIComponent(redirect_url)}&code_verifier=${encodeURIComponent(codeVerifier)}`

  try {
    const response = await axios.post(DIGILOCKER_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return { message: `Error fetching DigiLocker token: ${errorMessage}` }
  }
}

export const fetchAadhaarData = async (accessToken: string): Promise<{ message: string }> => {
  try {
    const response = await axios.get(DIGILOCKER_AADHAAR, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return { message: `Error fetching Aadhaar data: ${errorMessage}` }
  }
}

export const fetchIssuedDocuments = async (accessToken: string): Promise<{ message: string }> => {
  try {
    const response = await axios.get(DIGILOCKER_ISSUE_DOCUMENT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return { message: `Error fetching issued documents: ${errorMessage}` }
  }
}

export const fetchDocumentData = async (uri: string, accessToken: string): Promise<{ message: string }> => {
  const documentUrl = `${DIGILOCKER_FETCH_DOCUMENT}${uri}`

  try {
    const response = await axios.get(documentUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return { message: `Error fetching document data: ${errorMessage}` }
  }
}

export const fetchDocument = async (uri: string, accessToken: string): Promise<{ message: string }> => {
  const documentUrl = `${DIGILOCKER_FETCH_FILE}${uri}`

  try {
    const response = await axios.get(documentUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return response.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return { message: `Error fetching document data: ${errorMessage}` }
  }
}
