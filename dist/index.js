"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ENDPOINT_ROOT = void 0;
exports.loadServerDebugConfig = loadServerDebugConfig;
exports.setServerOverrideUrl = setServerOverrideUrl;
exports.enableRequestLogging = enableRequestLogging;
const axios_1 = __importStar(require("axios"));
const AxiosLogger = __importStar(require("axios-logger"));
const debug_config_1 = require("./debug-config");
function loadServerDebugConfig() {
    if (debug_config_1.DEBUG && debug_config_1.DEBUG_CONFIG.SERVER !== undefined) {
        setServerOverrideUrl(debug_config_1.DEBUG_CONFIG.SERVER);
    }
    if (debug_config_1.DEBUG && debug_config_1.DEBUG_CONFIG.REQUEST_LOGGING) {
        switch (debug_config_1.DEBUG_CONFIG.REQUEST_LOGGING) {
            case 'full':
                enableRequestLogging({ full: true });
                break;
            case 'no_contents':
            default:
                enableRequestLogging({ full: false });
                break;
        }
    }
}
function setServerOverrideUrl(url) {
    serverOverrideUrl = url;
    console.log(`[RUNNER-DEBUG] Using custom backend: '${url}'`);
}
let serverOverrideUrl = null;
let axiosRequestLogging = false;
function enableRequestLogging(config) {
    axiosRequestLogging = true;
    if (!config?.full) {
        AxiosLogger.setGlobalConfig({
            data: false
        });
        console.log("[RUNNER-DEBUG] Enabling reduced Axios logging");
    }
    else {
        console.log("[RUNNER-DEBUG] Enabling full Axios logging");
    }
}
exports.ENDPOINT_ROOT = '/runner';
const api = (token, tokenType = "Runner") => {
    const ax = axios_1.default.create({
        baseURL: serverOverrideUrl || 'https://europe-west1-daisy-367210.cloudfunctions.net',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Runner ${token}`,
        },
    });
    if (axiosRequestLogging) {
        ax.interceptors.request.use(AxiosLogger.requestLogger);
        ax.interceptors.response.use(AxiosLogger.responseLogger);
    }
    return ax;
};
const errorHandler = (error) => {
    if (error instanceof axios_1.AxiosError) {
        if (error.response) { // server responsed, but Axios did not like it
            if (typeof error.response?.data?.error === 'string')
                throw new Error(error.response?.data?.error);
            else if (typeof error.response?.data?.error === 'object')
                throw new Error(JSON.stringify(error.response?.data?.error) || 'Unknown error');
            else if (error.response?.data)
                throw new Error(JSON.stringify(error.response?.data) || 'Unknown error');
            else
                throw new Error(`${error.message}`);
        }
        else if (error.request) { // no response from server
            throw new Error(`${error.message}`);
        }
    }
    throw new Error(error.message || 'Unknown error');
};
exports.errorHandler = errorHandler;
exports.default = api;
