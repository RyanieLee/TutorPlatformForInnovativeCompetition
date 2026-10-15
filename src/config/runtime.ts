export const apiMode = import.meta.env.VITE_DATA_MODE === 'api'
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
