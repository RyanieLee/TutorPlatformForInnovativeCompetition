import { apiBaseUrl } from '../config/runtime'
export function publicTutorPhoto(url?: string): string {
  return url?.startsWith('/api/tutors/') ? apiBaseUrl + url : url || ''
}
