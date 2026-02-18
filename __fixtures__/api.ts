import { jest } from '@jest/globals'
import type { AxiosResponse } from 'axios'

// Mock response builders for axios instance methods
export const mockPost = jest.fn<(path: string, body: object) => Promise<AxiosResponse>>()
  .mockImplementation((path, body) => {
    console.log(`[mockPost] POST ${path}`, JSON.stringify(body, null, 2))
    return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} as any })
  })

export const mockGet = jest.fn<(path: string) => Promise<AxiosResponse>>()
  .mockImplementation((path) => {
    console.log(`[mockGet] GET ${path}`)
    return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} as any })
  })

// Mock api function that returns an object with stubbable post/get methods
export const api = jest.fn(() => ({
  post: mockPost,
  get: mockGet,
}))



// Re-export error handler as a no-op mock
export const errorHandler = jest.fn((error: any) => { throw error })

// Re-export loadServerDebugConfig as a no-op mock
export const loadServerDebugConfig = jest.fn()

