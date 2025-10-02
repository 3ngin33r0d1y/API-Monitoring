import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Activity, Server, Globe, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Clock, Zap, Shield, Eye, Settings } from 'lucide-react';
import { useData, computeMetrics, filterApis } from '../useData';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

// Version comparison function
const compareVersions = (a: string, b: string): number => {
  const parseVersion = (version: string) => {
    return version.replace(/^v/, '').split('.').map(num => parseInt(num, 10) || 0);
  };

  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
    const numA = versionA[i] || 0;
    const numB = versionB[i] || 0;

    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
};

export default function Dashboard() {
  const { state, reload } = useData(true);
  const [projectId, setProjectId] = useState<number | 'all'>('all');
  const [env, setEnv] = useState<'all' | 'dev' | 'staging' | 'prod'>('all');
  const [region, setRegion] = useState<'all' | 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1'>('all');

  const filtered = useMemo(() => filterApis(state.apis, projectId, env, region), [state.apis, projectId, env, region]);
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  // Enhanced metrics calculations with CORRECTED COMPLIANCE CALCULATION
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

    // Response time trends (mock data for demo)
    const responseTimeTrends = [
      { time: '00:00', responseTime: 120 },
      { time: '04:00', responseTime: 98 },
      { time: '08:00', responseTime: 156 },
      { time: '12:00', responseTime: 134 },
      { time: '16:00', responseTime: 142 },
      { time: '20:00', responseTime: 118 },
    ];

    // CORRECTED COMPLIANCE CALCULATION
    const calculateComplianceScore = () => {
      if (filtered.length === 0) return 100;

      // Group APIs by service name
      const serviceGroups = filtered.reduce((acc, api) => {
        const serviceName = api.name || 'unknown';
        if (!acc[serviceName]) acc[serviceName] = {};
        acc[serviceName][api.environment || 'unknown'] = api;
        return acc;
      }, {} as Record<string, Record<string, any>>);

      let totalServices = Object.keys(serviceGroups).length;
      let servicesWithViolations = 0;

      // Check each service for violations
      Object.values(serviceGroups).forEach(environments => {
        const dev = environments.dev || environments.development;
        const uat = environments.uat || environments.staging;
        const oat = environments.oat;
        const prod = environments.prod || environments.production;

        let hasViolation = false;

        // CORRECTED RULES:
        // Rule 1: PROD should NEVER be higher than UAT
        if (prod?.version && uat?.version && compareVersions(prod.version, uat.version) > 0) {
          hasViolation = true;
        }

        // Rule 2: PROD should NEVER be higher than OAT
        if (prod?.version && oat?.version && compareVersions(prod.version, oat.version) > 0) {
          hasViolation = true;
        }

        // Rule 3: OAT should NEVER be higher than UAT
        if (oat?.version && uat?.version && compareVersions(oat.version, uat.version) > 0) {
          hasViolation = true;
        }

        if (hasViolation) {
          servicesWithViolations++;
        }
      });

      // Calculate compliance: (compliant services / total services) * 100
      const compliantServices = totalServices - servicesWithViolations;
      return totalServices > 0 ? Math.round((compliantServices / totalServices) * 100) : 100;
    };

    // Calculate uptime percentage
    const uptimePercent = filtered.length > 0 ? Math.round((onlineApis.length / filtered.length) * 100) : 100;

    // Use corrected compliance calculation
    const compliancePercent = calculateComplianceScore();

    return {
      totalApis: filtered.length,
      onlineApis: onlineApis.length,
      offlineApis: offlineApis.length,
      avgResponseTime: Math.round(avgResponseTime),
      uptimePercent: uptimePercent,
      compliancePercent: compliancePercent,
      envDistribution: Object.entries(envDistribution).map(([name, value]) => ({ name, value })),
      regionDistribution: Object.entries(regionDistribution).map(([name, value]) => ({ name, value })),
      responseTimeTrends,
      httpsPercentage: metrics.httpsPercentage,
      avgResponseTimeChange: -5, // Mock data
      uptimeChange: 2, // Mock data
      complianceChange: -4, // Mock data
    };
  }, [filtered] );

  const MetricCard = ({
                        icon: Icon,
                        title,
                        value,
                        change,
                        color,
                        trend
                      }: {
    icon: any,
    title: string,
    value: string | number,
    change?: string,
    color: string,
    trend?: 'up' | 'down' | 'neutral'
  }) => (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
              <div className={`flex items-center space-x-1 ${
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
              </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
              <p className="text-xs text-gray-500">{change}</p>
          )}
        </div>
      </div>
  );

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  API Monitoring Dashboard
                </h1>
                <p className="text-gray-600">Real-time insights into your API ecosystem</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
              <button
                  onClick={reload}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Smart Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Smart Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                >
                  <option value="all">🌐 All Projects</option>
                  {state.projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Environment</label>
                <select
                    value={env}
                    onChange={(e) => setEnv(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                >
                  <option value="all">🌍 All Environments</option>
                  <option value="dev">🔧 Development</option>
                  <option value="staging">🧪 Staging</option>
                  <option value="prod">🚀 Production</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Region</label>
                <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                >
                  <option value="all">🗺️ All Regions</option>
                  <option value="us-east-1">🇺🇸 US East 1</option>
                  <option value="us-west-2">🇺🇸 US West 2</option>
                  <option value="eu-west-1">🇪🇺 EU West 1</option>
                  <option value="ap-southeast-1">🌏 AP Southeast 1</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">Live Filtering</span>
                  <div className="text-xs text-blue-500">Updates in real-time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
                icon={Server}
                title="Total APIs"
                value={enhancedMetrics.totalApis}
                change="+12% from last week"
                color="bg-gradient-to-r from-blue-500 to-blue-600"
                trend="up"
            />
            <MetricCard
                icon={CheckCircle}
                title="System Uptime"
                value={`${enhancedMetrics.uptimePercent}%`}
                change="99.9% SLA target"
                color="bg-gradient-to-r from-green-500 to-green-600"
                trend="up"
            />
            <MetricCard
                icon={Zap}
                title="Avg Response"
                value={`${enhancedMetrics.avgResponseTime}ms`}
                change="-5ms from yesterday"
                color="bg-gradient-to-r from-purple-500 to-purple-600"
                trend="down"
            />
            <MetricCard
                icon={Shield}
                title="Compliance"
                value={`${enhancedMetrics.compliancePercent}%`}
                change="Version compliance"
                color="bg-gradient-to-r from-red-500 to-red-600"
                trend="down"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Trends */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Response Time Trends</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>Last 24 hours</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={enhancedMetrics.responseTimeTrends}>
                  <defs>
                    <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="time" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                  />
                  <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="url(#responseTimeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Environment Distribution */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Environment Distribution</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  <span>Active APIs</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                      data={enhancedMetrics.envDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                  >
                    {enhancedMetrics.envDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Overview */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">{enhancedMetrics.onlineApis} APIs Online</p>
                  <p className="text-sm text-green-700">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">{enhancedMetrics.offlineApis} APIs Offline</p>
                  <p className="text-sm text-yellow-700">Monitoring required</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">{enhancedMetrics.compliancePercent}% Compliant</p>
                  <p className="text-sm text-blue-700">Version compliance score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
