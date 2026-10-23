import {defineConfig} from '@playwright/test'
import base from './playwright.config'
export default defineConfig({...base,testIgnore:[],testMatch:'**/student-continuity.spec.ts',timeout:150000,outputDir:'test-results/continuity',reporter:[['list'],['html',{open:'never',outputFolder:'playwright-report/continuity'}]]})
