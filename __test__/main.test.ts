/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as axiosApi from '../__fixtures__/api.js'
import axios from '../__fixtures__/axios.js'
import { AxiosHeaders, AxiosResponse } from 'axios'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/axios-api.js', () => axiosApi)
jest.unstable_mockModule('axios', () => ({ default: axios, ...axios }))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
    beforeEach(() => {
        // Set the action's inputs as return values from core.getInput().
        core.getInput.mockImplementation((name: string, opts: any) => {
            switch (name) {
                case 'file':
                    return 'docc_0.1.6_testUpload_amd64.deb'
                case 'version':
                    return '0.1.6'
                case 'architecture':
                    return 'x64'
                case 'token':
                    return 'test-token'
                case 'url':
                    return '/v1/system/docc-distributions/upload'
                case 'os':
                    return 'linux'
                case 'dist-id':
                    return 'ubuntu'
                case 'dist-version':
                    return '24.04'
                case 'channel':
                    return 'dev'
                default:
                    return ''
            }
        })
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    it('Requests upload URL', async () => {

        axiosApi.mockPost.mockImplementation(async (path, body): Promise<AxiosResponse> => {
            console.log(`[mockPost] POST ${path}`, JSON.stringify(body, null, 2))
            if (path === '/v1/system/docc-distributions/upload') {
                return {
                    data: {
                        url: 'https://fakeuploadurl.com/upload',
                        uploadId: 'test-upload-id',
                        entryCreated: true
                    },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                }
            } else if (path === '/v1/system/docc-distributions/upload/done') {
                return {
                    data: {
                        distId: 'test-dist-id',
                        msg: 'Upload completed successfully'
                    },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {} as any,
                }
            } else {
                throw new Error(`Unexpected API path: ${path}`)
            }
    })

        await run()


        // Verify the upload URL was requested.
        expect(axiosApi.mockPost).toHaveBeenCalledWith('/v1/system/docc-distributions/upload', {
            fileName: 'docc_0.1.6_testUpload_amd64.deb',
            version: '0.1.6',
            architecture: 'x64',
            os: 'linux',
            distro_meta: {
                id: 'ubuntu',
                version_id: '24.04',
            },
            sha256: '44a7f0a718bf1f5a623cd905b1e740f2bf9b80182b61c533656b4aefe979c60c',
            channel: 'dev'
        })
        expect(axios.put).toHaveBeenCalledWith('https://fakeuploadurl.com/upload', expect.anything(), expect.anything())
        expect(axiosApi.mockPost).toHaveBeenCalledWith('/v1/system/docc-distributions/upload/done', {
            fileName: 'docc_0.1.6_testUpload_amd64.deb',
            version: '0.1.6',
            architecture: 'x64',
            os: 'linux',
            distro_meta: {
                id: 'ubuntu',
                version_id: '24.04',
            },
            uploadId: 'test-upload-id',
            sha256: '44a7f0a718bf1f5a623cd905b1e740f2bf9b80182b61c533656b4aefe979c60c',
            channel: 'dev'
        })
    })
})
