import React from 'react'
import { useParams } from 'react-router-dom'

export default function ApiDetails(){
  const { id } = useParams()
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="font-semibold">API Details</div>
      <div className="text-sm text-gray-600">Endpoint ID: {id}</div>
      <div className="text-sm mt-2">Coming with more details as needed. Use All APIs or Services to manage checks.</div>
    </div>
  )
}
