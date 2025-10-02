import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Activity, Server, Globe, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Clock } from 'lucide-react';
import { useData, computeMetrics, filterApis } from '../useData';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export default function EnhancedDashboard() {
  const { state, reload } = useData(true);
  const [projectId, setProjectId] = useState<number | 'all'>('all');
  const [env, setEnv] = useState<'all' | 'dev' | 'staging' | 'prod'>('all');
  const [region, setRegion] = useState<'all' | 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1'>('all');

  const filtered = useMemo(() => filterApis(state.apis, projectId, env, region), [state.apis, projectId, env, region]);
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  // Enhanced metrics calculations
  const enhancedMetrics = useMemo(() => {
    const onlineApis = filtered.filter(api => api.status === 'online');
    const offlineApis = filtered.filter(api => api.status === 'offline');
    const avgResponseTime = onlineApis.length > 0 
      ? onlineApis.reduce((sum, api) => sum + (api.responseTime || 0), 0) / onlineApis.length 
      : 0;

    // Environment distribution
    const envDistribution = filtered.reduce((acc, api) => {
      const environment = api.environment || 'unknown';
      acc[environment] = (acc[environment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Region distribution
    const regionDistribution = filtered.reduce((acc, api) => {
      const apiRegion = api.region || 'unknown';
      acc[apiRegion] = (acc[apiRegion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      ...metrics,
      avgResponseTime: Math.round(avgResponseTime),
      onlineCount: onlineApis.length,
      offlineCount: offlineApis.length,
      envDistribution: Object.entries(envDistribution).map(([name, value]) => ({ name, value })),
      regionDistribution: Object.entries(regionDistribution).map(([name, value]) => ({ name, value }))
    };
  }, [filtered, metrics]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API Monitoring Dashboard</h1>
                <p className="text-gray-600 mt-1">Real-time monitoring and analytics for your API infrastructure</p>
              </div>
            </div>
            <button
              onClick={reload}
              disabled={state.loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          
          {/* Last Updated */}
          <div className="flex items-center space-x-2 mt-4 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date(state.lastUpdated).toLocaleString()}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={projectId as any} 
                onChange={e => setProjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All Projects</option>
                {state.projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={env} 
                onChange={e => setEnv(e.target.value as any)}
              >
                <option value="all">All Environments</option>
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="prod">Production</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={region} 
                onChange={e => setRegion(e.target.value as any)}
              >
                <option value="all">All Regions</option>
                <option value="us-east-1">US East 1</option>
                <option value="us-west-2">US West 2</option>
                <option value="eu-west-1">EU West 1</option>
                <option value="ap-southeast-1">AP Southeast 1</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                <span className="font-medium">Real-time filtering</span>
                <br />
                <span>Results update automatically</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total APIs"
            value={enhancedMetrics.totalApis}
            icon={<Server className="h-6 w-6" />}
            color="blue"
            trend="+12% from last week"
          />
          <MetricCard
            title="Uptime"
            value={`${enhancedMetrics.uptimePercent}%`}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
            trend="99.9% SLA target"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${enhancedMetrics.avgResponseTime}ms`}
            icon={<TrendingUp className="h-6 w-6" />}
            color="purple"
            trend="-5ms from yesterday"
          />
          <MetricCard
            title="Compliance Score"
            value={`${enhancedMetrics.compliancePercent}%`}
            icon={<AlertTriangle className="h-6 w-6" />}
            color={enhancedMetrics.compliancePercent >= 90 ? "green" : "red"}
            trend="Version compliance"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Environment Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={enhancedMetrics.envDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {enhancedMetrics.envDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Region Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Region Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={enhancedMetrics.regionDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Status Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-2xl font-bold text-green-600">{enhancedMetrics.onlineCount}</h4>
              <p className="text-gray-600">Online APIs</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h4 className="text-2xl font-bold text-red-600">{enhancedMetrics.offlineCount}</h4>
              <p className="text-gray-600">Offline APIs</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-2xl font-bold text-blue-600">{state.projects.length}</h4>
              <p className="text-gray-600">Total Projects</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red';
  trend?: string;
}

function MetricCard({ title, value, icon, color, trend }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
