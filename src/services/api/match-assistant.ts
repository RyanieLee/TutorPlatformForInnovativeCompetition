import type { TeachingMode } from '../../types/tutor'
import { apiRequest } from './client'

export interface MatchSuggestion {
  subject: string | null
  grade: string | null
  budget: number | null
  mode: TeachingMode | null
  preference: string | null
}

export function matchAssistantStatus(): Promise<{ enabled: boolean }> {
  return apiRequest('GET', '/api/match-assistant/status', undefined, false)
}

export function parseMatchBrief(brief: string): Promise<MatchSuggestion> {
  return apiRequest('POST', '/api/match-assistant/parse', { brief })
}
