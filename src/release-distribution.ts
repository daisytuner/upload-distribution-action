#!/usr/bin/env node

import fs from "fs";
import api, { errorHandler, loadServerDebugConfig } from "./index";
import { createHash } from "crypto";
import axios from "axios";
import fg from "fast-glob";
import path from "path";

export type DistroOsRelease = {
    name?: string
    id?: string
    id_like?: string
    platform_id?: string
    version_id?: string
}

type GenerateDistributableUploadUrlPayload = {
    fileName: string
    sha256?: string
    version?: string
    architecture?: string
    os?: string
    uploadId?: string
    distro_meta?: DistroOsRelease
    channel?: string
}

type DistributableUploadResponse = {
    url: string;
    uploadId?: string;
    entryCreated?: boolean
}

type DistributableUploadCompletedResponse = {
    distId?: string;
    msg?: string;
}


async function  generateDistributableUploadUrl(token: string, payload: GenerateDistributableUploadUrlPayload, rest_url: string): Promise<DistributableUploadResponse> {
    const response = await api(token, "Token").post<DistributableUploadResponse>(rest_url, payload).catch(errorHandler);
    return response.data;
}

async function notifyBackendUploadCompleted(token: string, payload: GenerateDistributableUploadUrlPayload, rest_url: string): Promise<DistributableUploadCompletedResponse> {
  const response = await api(token, "Token").post<DistributableUploadCompletedResponse>(rest_url, payload).catch(errorHandler);
  return response.data;
}
  

export async function uploadDistributable() {

    loadServerDebugConfig();

    const token = process.env['INPUT_TOKEN']!;

    if (!token) {
      throw new Error('INPUT_TOKEN is not set. You need to set it in the GitHub Actions workflow secrets. You can get the token from the DaisyTuner dashboard under the "Sessions" section.')
    }

    const inputFile = process.env['INPUT_FILE']!;
    const version = process.env['INPUT_VERSION']!;
    const architecture = process.env['INPUT_ARCHITECTURE']!;
    const os = process.env['INPUT_OS'] || undefined;
    const rest_url = process.env['INPUT_URL']!;
    const distro_id = process.env['INPUT_DIST_ID'] || undefined;
    const distro_version = process.env['INPUT_DIST_VERSION'] || undefined;
    const distro_platform_id = process.env['INPUT_DIST_PLATFORM_ID'] || undefined;
    const release_channel = process.env['INPUT_CHANNEL'] || undefined;

    const matchedFiles = await fg(inputFile);
    if (matchedFiles.length === 0) {
        console.error(`No files matched the pattern: ${inputFile}`);
        process.exit(1);
    }

    const targetFile = matchedFiles[0]; // Use the first matched file

    if (!fs.statSync(targetFile)) { // Check if the file exists
        console.error(`File ${targetFile} does not exist.`);
        process.exit(1);
    }

    console.log(`Uploading release ${targetFile} as v${version} for architecture ${architecture}, os ${os}`);


    const hasher = createHash('sha256');
    const fileBuffer = fs.readFileSync(targetFile);
    const sha256 = hasher.update(fileBuffer).digest('hex');
    console.log(`SHA256 of ${targetFile}: ${sha256}`);


    // Generate the upload url
    const reqPayload: GenerateDistributableUploadUrlPayload = {
      fileName: path.basename(targetFile),
      version: version,
      architecture: architecture,
      sha256: sha256,
      os: os,
      channel: release_channel,
      distro_meta: {
        id: distro_id,
        version_id: distro_version,
        platform_id: distro_platform_id
      }
    }
    const response = await generateDistributableUploadUrl(token, reqPayload, rest_url)

    const url = response.url

    console.log(`Starting upload under id '${response.uploadId}'`)

    const file = fs.readFileSync(targetFile);

    // Upload the file to the upload url
    try {
      const response = await axios.put(url, file, {
        headers: {
          'Content-Type': 'application/x-compressed'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentComplete = (progressEvent.loaded / progressEvent.total) * 100
            console.log('File upload progress: ', percentComplete.toFixed(2) + '%')
          }
        }
      })

      if (response.status === 200) { //TODO will this ever work? does axios not crash on any actual error?
        console.log('File uploaded successfully')
      } else {
        throw new Error(`Upload failed with status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error uploading file: ', error)
      throw error
    }

    const doneResponse = await notifyBackendUploadCompleted(token, {
        ...reqPayload,
        uploadId: response.uploadId
    }, rest_url + '/done')

    if (doneResponse.msg) {
        console.warn(`Backend response: ${doneResponse.msg}`);
    }

    if (!doneResponse.distId) {
        console.error('Upload confirmation failed, no distId returned')
        process.exit(1)
    }

    console.log(`Notified backend of completed file upload. Stored as "${doneResponse.distId}"`)
    
}
