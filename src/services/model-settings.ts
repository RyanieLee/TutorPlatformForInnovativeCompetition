import { apiRequest } from './api/client'
export interface ModelSettingsView {
  baseUrl: string; model: string; enabled: boolean; vision: boolean
  hasKey: boolean; storageError: boolean; configured: boolean; allowedHosts: string[]
}
export const loadModelSettings = () => apiRequest<ModelSettingsView>('GET', '/api/admin/model-settings')
export const saveModelSettings = (data: {baseUrl:string; model:string; enabled:boolean; vision:boolean; apiKey?:string}) => apiRequest<ModelSettingsView>('PUT', '/api/admin/model-settings', data)
export const testModelSettings = () => apiRequest<{ok:boolean;latencyMs:number;model:string;testedAt:string;scope:string}>('POST', '/api/admin/model-settings/test')
