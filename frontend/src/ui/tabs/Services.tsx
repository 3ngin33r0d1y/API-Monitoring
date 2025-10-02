import { useMemo, useState } from 'react'
import { filterApis, useData } from '../useData'

export default function Services(){
  const { state } = useData(true)
  const [projectId, setProjectId] = useState<number|'all'>('all')
  const [env, setEnv] = useState<'all'|'dev'|'staging'|'prod'>('all')
  const [region, setRegion] = useState<'all'|'us-east-1'|'us-west-2'|'eu-west-1'|'ap-southeast-1'>('all')

  const apis = useMemo(()=>filterApis(state.apis, projectId, env, region), [state.apis, projectId, env, region])

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="font-semibold mb-3">Services Health</div>
      <div className="grid md:grid-cols-2 gap-3">
        {apis.map(a=> (<ServiceCard key={a.id} a={a}/>))}
      </div>
    </div>
  )
}

function ServiceCard({a}:any){
  const badge = a.status==='online' ? 'bg-green-100 text-green-800' : a.status==='offline' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
  const https = a.url.startsWith('https://') ? null : <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">No HTTPS</span>
  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{a.url}</div>
        <span className={"px-2 py-1 rounded text-xs " + badge}>{a.status}</span>
      </div>
      <div className="text-xs text-gray-600 mt-1">env={a.environment} • region={a.region}</div>
      <div className="text-xs mt-2">Response: {a.responseTime ?? '—'} ms {https}</div>
    </div>
  )
}
