export const apiMode = import.meta.env.VITE_DATA_MODE === 'api'
// Hosted previews keep business fixtures while sending AI requests to their own server.
export const hostedAssistant = import.meta.env.VITE_HOSTED_ASSISTANT === 'true'
export const assistantApiMode = apiMode || hostedAssistant
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || (hostedAssistant && typeof location !== 'undefined' ? location.origin : '')).replace(/\/$/, '')
