#!/usr/bin/env node

import fs from "fs";
import { api, errorHandler, loadServerDebugConfig } from "./axios-api.js";
import { createHash } from "crypto";
import axios from "axios";
import fg from "fast-glob";
import path from "path";
import * as core from "@actions/core";

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

export async function run() {

    loadServerDebugConfig();

    const token = core.getInput('token', { required: true });

    if (!token) {
      throw new Error('INPUT_TOKEN is not set. You need to set it in the GitHub Actions workflow secrets. You can get the token from the DaisyTuner dashboard under the "Sessions" section.')
    }

    const inputFile = core.getInput('file', { required: true });
    const version = core.getInput('version', { required: true });
    const architecture = core.getInput('architecture', { required: true });
    const os = core.getInput('os') || undefined;
    const rest_url = core.getInput('url', { required: true });
    const distro_id = core.getInput('dist-id') || undefined;
    const distro_id_like = core.getInput('dist-id-like') || undefined;
    const distro_version = core.getInput('dist-version') || undefined;
    const distro_platform_id = core.getInput('dist-platform-id') || undefined;
    const release_channel = core.getInput('channel') || undefined;

    const matchedFiles = await fg(inputFile);
    if (matchedFiles.length === 0) {
        core.error(`No files matched the pattern: ${inputFile}`);
        process.exit(1);
    }

    const targetFile = matchedFiles[0]; // Use the first matched file

    if (!fs.statSync(targetFile)) { // Check if the file exists
        core.error(`File ${targetFile} does not exist.`);
        process.exit(1);
    }

    const targetInfo: Partial<GenerateDistributableUploadUrlPayload> = {
      version: version,
      architecture: architecture,
      os: os,
      channel: release_channel,
      distro_meta: {
        id: distro_id,
        id_like: distro_id_like,
        version_id: distro_version,
        platform_id: distro_platform_id
      }
    }

    core.info(`Uploading release ${targetFile} with metadata ${JSON.stringify(targetInfo)}`);


    const hasher = createHash('sha256');
    const fileBuffer = fs.readFileSync(targetFile);
    const sha256 = hasher.update(fileBuffer).digest('hex');
    core.info(`SHA256 of ${targetFile}: ${sha256}`);
    core.setOutput('sha256', sha256)


    // Generate the upload url
    const reqPayload: GenerateDistributableUploadUrlPayload = {
      ...targetInfo,
      fileName: path.basename(targetFile),
      sha256: sha256,
    }
    const response = await generateDistributableUploadUrl(token, reqPayload, rest_url)

    const url = response.url
    core.setOutput('entry-created', response.entryCreated || 'false')

    core.info(`Starting upload under id '${response.uploadId}'`)

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
            core.debug(`File upload progress: ${percentComplete.toFixed(2)}%`)
          }
        }
      })

      if (response.status === 200) { //TODO will this ever work? does axios not crash on any actual error?
        core.info('File uploaded successfully')
      } else {
        throw new Error(`Upload failed with status: ${response.status}`)
      }
    } catch (error) {
      core.error('Error uploading file: ' + error)
      throw error
    }

    const doneResponse = await notifyBackendUploadCompleted(token, {
        ...reqPayload,
        uploadId: response.uploadId
    }, rest_url + '/done')

    if (doneResponse.msg) {
        core.warning(`Backend response: ${doneResponse.msg}`);
    }

    if (!doneResponse.distId) {
        core.error('Upload confirmation failed, no distId returned')
        process.exit(1)
    }

    core.info(`Notified backend of completed file upload. Stored as "${doneResponse.distId}"`)
    core.setOutput('file-id', doneResponse.distId)
}
