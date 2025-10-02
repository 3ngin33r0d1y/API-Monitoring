export type Project = {
  id: number
  name: string
  createdAt: string
}

export type ApiItem = {
  id: number
  projectId: number
  url: string
  environment: 'dev' | 'staging' | 'prod' | string
  region: string
  status: 'online' | 'offline' | 'unknown' | string
  responseTime?: number | null
  lastChecked?: string | null
  createdAt: string
}
