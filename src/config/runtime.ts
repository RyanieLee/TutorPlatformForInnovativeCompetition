export const apiMode = import.meta.env.VITE_DATA_MODE === 'api'
// Hosted previews keep business fixtures while sending AI requests to their own server.
export const demoAiGateway = import.meta.env.VITE_DEMO_AI_GATEWAY === 'true'
export const hostedAssistant = import.meta.env.VITE_HOSTED_ASSISTANT === 'true' || demoAiGateway
export const assistantApiMode = apiMode || hostedAssistant
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || (hostedAssistant && typeof location !== 'undefined' ? location.origin : '')).replace(/\/$/, '')
