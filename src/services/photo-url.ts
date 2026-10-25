import { apiBaseUrl } from '../config/runtime'
export function publicTutorPhoto(url?: string): string {
  if (url?.startsWith('/api/tutors/')) return apiBaseUrl + url
  // #ifdef H5
  // GitHub Pages serves project sites below /repository-name/.
  if (url?.startsWith('/static/')) return (import.meta.env.BASE_URL || '/') + url.slice(1)
  // #endif
  return url || ''
}
