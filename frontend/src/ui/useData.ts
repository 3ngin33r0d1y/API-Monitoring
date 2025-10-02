import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api';
import type { ApiItem, Project } from '../types'

export type DataState = {
  projects: Project[]
  apis: ApiItem[]
  lastUpdated: number
  loading: boolean
  error?: string
}

export function useData(auto=true) {
  const [state, setState] = useState<DataState>({projects:[], apis:[], lastUpdated:0, loading:true})
  const timer = useRef<number|undefined>(undefined)

  const load = useCallback(async ()=>{
    setState(s=>({...s, loading:true, error: undefined}))
    try{
      const res = await api.get('/api/data/projects')
      const data = res.data
      setState({projects:data.projects, apis:data.apis, lastUpdated: Date.now(), loading:false})
    }catch(e:any){
      setState(s=>({...s, loading:false, error:e?.message || 'Failed to load'}))
    }
  }, [])

  useEffect(()=>{
    load()
    if(!auto) return
    timer.current = window.setInterval(load, 30000)
    return ()=>{ if(timer.current) clearInterval(timer.current) }
  }, [load, auto])

  return { state, reload: load }
}

export function computeMetrics(apis: ApiItem[]) {
  const total = apis.length
  const online = apis.filter(a=>a.status==='online').length
  const avgResp = total ? Math.round(apis.reduce((acc,a)=>acc+(a.responseTime||0),0)/total) : 0
  const uptime = total ? Math.round((online/total)*100) : 0
  const errors = apis.filter(a=>a.status==='offline').length
  const errorRate = total ? Math.round((errors/total)*100) : 0

  const https = apis.filter(a=>a.url.startsWith('https://'))
  const fast = apis.filter(a=>(a.responseTime ?? 0) <= 1000)
  const httpsScore = total ? (https.length/total)*100 : 0
  const responseTimeScore = total ? (fast.length/total)*100 : 0
  const availabilityScore = total ? (online/total)*100 : 0
  const overallScore = (httpsScore + responseTimeScore + availabilityScore) / 3

  return { total, online, avgResp, uptime, errors, errorRate, httpsScore, responseTimeScore, availabilityScore, overallScore }
}

export function filterApis(apis: ApiItem[], projectId: number|'all', env: string|'all', region: string|'all') {
  return apis.filter(a=>(
    (projectId==='all' || a.projectId===projectId) &&
    (env==='all' || a.environment===env) &&
    (region==='all' || a.region===region)
  ))
}
