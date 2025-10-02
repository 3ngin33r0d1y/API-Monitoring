import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, Shield, TrendingUp, AlertCircle, Zap, Globe, Server, Eye, ExternalLink } from "lucide-react";
import { useData } from '../useData';
import api from "../../lib/api";

type ApiResponse = {
    service: string;
    version: string;
    url: string;
    status: string;
    environment: string;
    region: string;
    responseTime?: number;
    projectId?: number;
    projectName?: string;
};

type ServiceViolation = {
    service: string;
    projectName: string;
    violation: string;
    severity: 'critical' | 'warning' | 'info';
    environments: {
        dev?: string;
        uat?: string;
        oat?: string;
        prod?: string;
    };
};

type ComplianceResult = {
    services: Record<string, Record<string, ApiResponse>>;
    violations: ServiceViolation[];
    totalViolations: number;
    criticalViolations: number;
    warningViolations: number;
    compliantServices: number;
    totalServices: number;
    complianceScore: number;
    timestamp: string;
};

// Version comparison function - same as Dashboard
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

export default function Compliance() {
    const { state } = useData(true);
    const [complianceData, setComplianceData] = useState<ComplianceResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // CORRECTED COMPLIANCE CALCULATION - Same as Dashboard
    const calculateCompliance = useMemo(() => {
        return () => {
            if (!state.apis || state.apis.length === 0) {
                return {
                    services: {},
                    violations: [],
                    totalViolations: 0,
                    criticalViolations: 0,
                    warningViolations: 0,
                    compliantServices: 0,
                    totalServices: 0,
                    complianceScore: 100,
                    timestamp: new Date().toISOString()
                };
            }

            // Group APIs by service name
            const serviceGroups = state.apis.reduce((acc, api) => {
                const serviceName = api.name || 'unknown';
                if (!acc[serviceName]) acc[serviceName] = {};
                acc[serviceName][api.environment || 'unknown'] = {
                    service: serviceName,
                    version: api.version || '0.0.0',
                    url: api.url,
                    status: api.status || 'unknown',
                    environment: api.environment || 'unknown',
                    region: api.region || 'unknown',
                    responseTime: api.responseTime,
                    projectId: api.projectId,
                    projectName: state.projects.find(p => p.id === api.projectId)?.name || 'Unknown'
                };
                return acc;
            }, {} as Record<string, Record<string, ApiResponse>>);

            const violations: ServiceViolation[] = [];
            let servicesWithViolations = 0;

            // Check each service for violations
            Object.entries(serviceGroups).forEach(([serviceName, environments]) => {
                const dev = environments.dev || environments.development;
                const uat = environments.uat || environments.staging;
                const oat = environments.oat;
                const prod = environments.prod || environments.production;

                let hasViolation = false;
                const serviceViolations: ServiceViolation[] = [];

                // CORRECTED RULES:
                // Rule 1: PROD should NEVER be higher than UAT
                if (prod?.version && uat?.version && compareVersions(prod.version, uat.version) > 0) {
                    serviceViolations.push({
                        service: serviceName,
                        projectName: prod.projectName || 'Unknown',
                        violation: `CRITICAL: PROD version (${prod.version}) is higher than UAT version (${uat.version})`,
                        severity: 'critical',
                        environments: {
                            dev: dev?.version,
                            uat: uat?.version,
                            oat: oat?.version,
                            prod: prod?.version
                        }
                    });
                    hasViolation = true;
                }

                // Rule 2: PROD should NEVER be higher than OAT
                if (prod?.version && oat?.version && compareVersions(prod.version, oat.version) > 0) {
                    serviceViolations.push({
                        service: serviceName,
                        projectName: prod.projectName || 'Unknown',
                        violation: `CRITICAL: PROD version (${prod.version}) is higher than OAT version (${oat.version})`,
                        severity: 'critical',
                        environments: {
                            dev: dev?.version,
                            uat: uat?.version,
                            oat: oat?.version,
                            prod: prod?.version
                        }
                    });
                    hasViolation = true;
                }

                // Rule 3: OAT should NEVER be higher than UAT
                if (oat?.version && uat?.version && compareVersions(oat.version, uat.version) > 0) {
                    serviceViolations.push({
                        service: serviceName,
                        projectName: oat.projectName || uat.projectName || 'Unknown',
                        violation: `WARNING: OAT version (${oat.version}) is higher than UAT version (${uat.version})`,
                        severity: 'warning',
                        environments: {
                            dev: dev?.version,
                            uat: uat?.version,
                            oat: oat?.version,
                            prod: prod?.version
                        }
                    });
                    hasViolation = true;
                }

                // Rule 4: Check for missing environments (optional warnings)
                if (prod && !uat) {
                    serviceViolations.push({
                        service: serviceName,
                        projectName: prod.projectName || 'Unknown',
                        violation: `WARNING: PROD exists (${prod.version}) but UAT environment is missing`,
                        severity: 'warning',
                        environments: {
                            dev: dev?.version,
                            uat: uat?.version,
                            oat: oat?.version,
                            prod: prod?.version
                        }
                    });
                    hasViolation = true;
                }

                violations.push(...serviceViolations);
                if (hasViolation) {
                    servicesWithViolations++;
                }
            });

            const totalServices = Object.keys(serviceGroups).length;
            const compliantServices = totalServices - servicesWithViolations;
            const complianceScore = totalServices > 0 ? Math.round((compliantServices / totalServices) * 100) : 100;

            return {
                services: serviceGroups,
                violations,
                totalViolations: violations.length,
                criticalViolations: violations.filter(v => v.severity === 'critical').length,
                warningViolations: violations.filter(v => v.severity === 'warning').length,
                compliantServices,
                totalServices,
                complianceScore,
                timestamp: new Date().toISOString()
            };
        };
    }, [state.apis, state.projects]);

    const checkCompliance = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = calculateCompliance();
            setComplianceData(result);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Compliance check failed:', err);
            setError('Failed to check compliance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkCompliance();
    }, [calculateCompliance]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            checkCompliance();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, calculateCompliance]);

    const MetricCard = ({
                            icon: Icon,
                            title,
                            value,
                            color,
                            description
                        }: {
        icon: any,
        title: string,
        value: string | number,
        color: string,
        description?: string
    }) => (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {description && (
                        <p className="text-xs text-gray-500 mt-1">{description}</p>
                    )}
                </div>
            </div>
        </div>
    );

    const getEnvironmentBadgeColor = (env: string) => {
        switch (env.toLowerCase()) {
            case 'dev':
            case 'development':
                return 'bg-green-100 text-green-800';
            case 'uat':
            case 'staging':
                return 'bg-yellow-100 text-yellow-800';
            case 'oat':
                return 'bg-orange-100 text-orange-800';
            case 'prod':
            case 'production':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading && !complianceData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Checking compliance...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-4" />
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={checkCompliance}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!complianceData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
                <div className="text-center">
                    <Server className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No compliance data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl shadow-lg">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                                Compliance Monitoring
                            </h1>
                            <p className="text-gray-600">Version compliance validation across environments</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <label className="flex items-center space-x-2 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span>Auto-refresh</span>
                            </label>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Eye className="w-4 h-4" />
                            <span>Updated: {lastUpdated?.toLocaleTimeString()}</span>
                        </div>
                        <button
                            onClick={checkCompliance}
                            disabled={loading}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Check Compliance</span>
                        </button>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        icon={Server}
                        title="Total Services"
                        value={complianceData.totalServices}
                        color="bg-gradient-to-r from-blue-500 to-blue-600"
                    />
                    <MetricCard
                        icon={AlertTriangle}
                        title="Total Violations"
                        value={complianceData.totalViolations}
                        color="bg-gradient-to-r from-red-500 to-red-600"
                    />
                    <MetricCard
                        icon={AlertCircle}
                        title="Critical Issues"
                        value={complianceData.criticalViolations}
                        color="bg-gradient-to-r from-orange-500 to-orange-600"
                    />
                    <MetricCard
                        icon={Shield}
                        title="Compliance Score"
                        value={`${complianceData.complianceScore}%`}
                        color="bg-gradient-to-r from-red-500 to-red-600"
                        description="Services without violations"
                    />
                </div>

                {/* Violations Section */}
                {complianceData.violations.length > 0 ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                        <div className="flex items-center space-x-2 mb-6">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <h2 className="text-xl font-semibold text-gray-900">
                                Compliance Violations ({complianceData.violations.length})
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {complianceData.violations.map((violation, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-lg border-l-4 ${
                                        violation.severity === 'critical'
                                            ? 'bg-red-50 border-red-500'
                                            : violation.severity === 'warning'
                                                ? 'bg-yellow-50 border-yellow-500'
                                                : 'bg-blue-50 border-blue-500'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                {violation.severity === 'critical' ? (
                                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                                ) : (
                                                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                                )}
                                                <span className="font-semibold text-gray-900">
                                                    {violation.service}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    in {violation.projectName}
                                                </span>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    violation.severity === 'critical'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {violation.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 mb-3">{violation.violation}</p>
                                            <div className="flex items-center space-x-2">
                                                {Object.entries(violation.environments).map(([env, version]) =>
                                                    version ? (
                                                        <span
                                                            key={env}
                                                            className={`px-2 py-1 text-xs font-medium rounded-full ${getEnvironmentBadgeColor(env)}`}
                                                        >
                                                            {env.toUpperCase()}: v{version}
                                                        </span>
                                                    ) : null
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20 text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">All Systems Compliant</h3>
                        <p className="text-gray-600">No version compliance violations detected across all environments.</p>
                    </div>
                )}

                {/* Environment Version Matrix */}
                {Object.keys(complianceData.services).length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Environment Version Matrix</h3>
                        <p className="text-gray-600 mb-4">Real-time version comparison across all environments</p>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Service</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Project</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-900">DEV</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-900">UAT</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-900">OAT</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-900">PROD</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Response Time</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Object.entries(complianceData.services).map(([serviceName, environments]) => {
                                    const hasViolation = complianceData.violations.some(v => v.service === serviceName);
                                    const sampleEnv = Object.values(environments)[0];

                                    return (
                                        <tr key={serviceName} className={`border-b border-gray-100 hover:bg-gray-50 ${hasViolation ? 'bg-red-50' : ''}`}>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-medium text-gray-900">{serviceName}</span>
                                                    {hasViolation && (
                                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{sampleEnv?.projectName || 'Unknown'}</td>
                                            <td className="py-3 px-4 text-center">
                                                {environments.dev || environments.development ? (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                            v{environments.dev?.version || environments.development?.version}
                                                        </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {environments.uat || environments.staging ? (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                                            v{environments.uat?.version || environments.staging?.version}
                                                        </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {environments.oat ? (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                                            v{environments.oat.version}
                                                        </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {environments.prod || environments.production ? (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                                            v{environments.prod?.version || environments.production?.version}
                                                        </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                                        sampleEnv?.status === 'online'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        {sampleEnv?.status || 'unknown'}
                                                    </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <Zap className="w-4 h-4 text-yellow-500" />
                                                    <span className="text-sm text-gray-600">
                                                            {sampleEnv?.responseTime || 0}ms
                                                        </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button className="text-blue-600 hover:text-blue-800 transition-colors">
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
