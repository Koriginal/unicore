export type SecureStorageData = {
  value?: string
  trustedDeviceToken?: string
  oauth?: Record<string, unknown>
  apiKey?: string
  updatedAt?: number
  [key: string]: unknown
}

export interface SecureStorage {
  name: string
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}

export type SecureStorageInitResult = {
  storage: SecureStorage
  warning?: string
}
