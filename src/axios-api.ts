import axios, { AxiosError } from "axios";
import * as AxiosLogger from 'axios-logger';
import { DEBUG, DEBUG_CONFIG } from "./debug-config.js";

export function loadServerDebugConfig() {
  if (DEBUG && DEBUG_CONFIG.SERVER !== undefined) {
    setServerOverrideUrl(DEBUG_CONFIG.SERVER)
  }
  if (DEBUG && DEBUG_CONFIG.REQUEST_LOGGING) {
    switch (DEBUG_CONFIG.REQUEST_LOGGING) {
      case 'full':
        enableRequestLogging({full: true});
        break;
      case 'no_contents':
      default:
        enableRequestLogging({full: false});
        break;
    }
  }
}

export function setServerOverrideUrl(url: string | null) {
  serverOverrideUrl = url;
  console.log(`[RUNNER-DEBUG] Using custom backend: '${url}'`)
}
let serverOverrideUrl: string | null = null

let axiosRequestLogging: boolean = false

export function enableRequestLogging(config?: { full?: boolean }) {
  
  axiosRequestLogging = true
  if (!config?.full) {
    AxiosLogger.setGlobalConfig({
      data: false
    })
    console.log("[RUNNER-DEBUG] Enabling reduced Axios logging")
  } else {
    console.log("[RUNNER-DEBUG] Enabling full Axios logging")
  }
}

export const ENDPOINT_ROOT = '/runner'

export const api = (token: string, tokenType: string = "Runner") => {
  const ax = axios.create({
    baseURL: serverOverrideUrl || 'https://europe-west1-daisy-367210.cloudfunctions.net',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Runner ${token}`,
    },
  })

  if (axiosRequestLogging) {
    ax.interceptors.request.use(AxiosLogger.requestLogger);
    ax.interceptors.response.use(AxiosLogger.responseLogger);
  }

  return ax
}

export const errorHandler = (error: any) => {
  if (error instanceof AxiosError) {
    if (error.response) { // server responsed, but Axios did not like it
      if (typeof error.response?.data?.error === 'string') 
        throw new Error(error.response?.data?.error)
      else if (typeof error.response?.data?.error === 'object')
        throw new Error(JSON.stringify(error.response?.data?.error) || 'Unknown error')
      else if (error.response?.data)
        throw new Error(JSON.stringify(error.response?.data) || 'Unknown error')
      else
        throw new Error(`${error.message}`)
    } else if (error.request) { // no response from server
      throw new Error(`${error.message}`)
    }
  }

  throw new Error( error.message || 'Unknown error')
}
