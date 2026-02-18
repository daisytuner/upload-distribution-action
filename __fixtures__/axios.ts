import { jest } from '@jest/globals'
import type { AxiosResponse, AxiosStatic } from 'axios'

// Mock axios.put for file uploads - always simulates successful upload by default
export const put = jest.fn<() => Promise<AxiosResponse>>().mockResolvedValue({
  status: 200,
  statusText: 'OK',
  data: {},
  headers: {},
  config: {} as any,
})

// Mock axios.get
export const get = jest.fn<() => Promise<AxiosResponse>>()

// Mock axios.post
export const post = jest.fn<() => Promise<AxiosResponse>>()

// Mock axios.create (returns a mock instance)
export const create = jest.fn()

// Default export to mimic axios module structure
const axios = {
  put,
  get,
  post,
  create,
} as unknown as AxiosStatic

export default axios
