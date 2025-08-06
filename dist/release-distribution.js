#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const index_1 = __importStar(require("./index"));
const crypto_1 = require("crypto");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const generateDistributableUploadUrl = async (token, payload, rest_url) => {
    const response = await (0, index_1.default)(token, "Token").post(rest_url, payload).catch(index_1.errorHandler);
    return response.data;
};
const uploadDistributable = async () => {
    (0, index_1.loadServerDebugConfig)();
    const token = process.env['INPUT_TOKEN'];
    if (!token) {
        throw new Error('DAISYTUNER_API_TOKEN is not set. You need to set it in the GitHub Actions workflow secrets. You can get the token from the DaisyTuner dashboard under the "Sessions" section.');
    }
    const targetFile = process.env['INPUT_FILE'];
    const version = process.env['INPUT_VERSION'];
    const architecture = process.env['INPUT_ARCHITECTURE'];
    const rest_url = process.env['INPUT_URL'];
    if (!fs_1.default.statSync(targetFile)) { // Check if the file exists
        console.error(`File ${targetFile} does not exist.`);
        process.exit(1);
    }
    console.log(`Uploading release ${targetFile} as v${version} for architecture ${architecture}`);
    const hasher = (0, crypto_1.createHash)('sha256');
    const fileBuffer = fs_1.default.readFileSync(targetFile);
    const sha256 = hasher.update(fileBuffer).digest('hex');
    console.log(`SHA256 of ${targetFile}: ${sha256}`);
    // Generate the upload url
    const response = await generateDistributableUploadUrl(token, {
        fileName: path_1.default.basename(targetFile),
        version: version,
        architecture: architecture,
        sha256: sha256,
    }, rest_url);
    const url = response.url;
    const file = fs_1.default.readFileSync(targetFile);
    // Upload the file to the upload url
    try {
        const response = await axios_1.default.put(url, file, {
            headers: {
                'Content-Type': 'application/x-compressed'
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
                    console.log('File upload progress: ', percentComplete.toFixed(2) + '%');
                }
            }
        });
        if (response.status === 200) { //TODO will this ever work? does axios not crash on any actual error?
            console.log('File uploaded successfully');
        }
        else {
            throw new Error(`Upload failed with status: ${response.status}`);
        }
    }
    catch (error) {
        console.error('Error uploading file: ', error);
        throw error;
    }
};
uploadDistributable();
