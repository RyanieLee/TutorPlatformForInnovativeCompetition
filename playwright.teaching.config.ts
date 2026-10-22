import {defineConfig} from '@playwright/test'
import base from './playwright.config'
// A fresh API process/database per suite keeps existing login limits intact.
export default defineConfig({...base,testIgnore:[],testMatch:'**/teaching-loop.spec.ts',outputDir:'test-results/teaching',reporter:[['list'],['html',{open:'never',outputFolder:'playwright-report/teaching'}]]})
