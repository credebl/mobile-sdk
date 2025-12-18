import { sendErrorResponse } from '@animo-id/expo-digital-credentials-api'

export const sendErrorResponseForDcApi = (errorMessage: string) => {
	sendErrorResponse({ errorMessage })
}

