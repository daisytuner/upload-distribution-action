#!/usr/bin/env node

import fs from "fs";
import api, { errorHandler, loadServerDebugConfig } from "./index";
import { createHash } from "crypto";
import axios from "axios";
import fg from "fast-glob";
import path from "path";

type GenerateDistributableUploadUrlPayload = {
    fileName: string
    sha256?: string
    version?: string
    architecture?: string
    os?: string
}

type DistributableUploadResponse = {
    success: boolean;
    data: {
        uploadUrl: string;
    };
}


const generateDistributableUploadUrl = async (token: string, payload: GenerateDistributableUploadUrlPayload, rest_url: string): Promise<DistributableUploadResponse> => {
    const response = await api(token, "Token").post<DistributableUploadResponse>(rest_url, payload).catch(errorHandler);
    return response.data;
}
  

const uploadDistributable = async () => {

    loadServerDebugConfig();

    const token = process.env['INPUT_TOKEN']!;

    if (!token) {
      throw new Error('DAISYTUNER_API_TOKEN is not set. You need to set it in the GitHub Actions workflow secrets. You can get the token from the DaisyTuner dashboard under the "Sessions" section.')
    }

    const inputFile = process.env['INPUT_FILE']!;
    const version = process.env['INPUT_VERSION']!;
    const architecture = process.env['INPUT_ARCHITECTURE']!;
    const rest_url = process.env['INPUT_URL']!;

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

    console.log(`Uploading release ${targetFile} as v${version} for architecture ${architecture}`);


    const hasher = createHash('sha256');
    const fileBuffer = fs.readFileSync(targetFile);
    const sha256 = hasher.update(fileBuffer).digest('hex');
    console.log(`SHA256 of ${targetFile}: ${sha256}`);


    // Generate the upload url
    const response = await generateDistributableUploadUrl(token, {
      fileName: path.basename(targetFile),
      version: version,
      architecture: architecture,
      sha256: sha256,
    }, rest_url)

    const url = response.data.uploadUrl;

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


}

uploadDistributable()