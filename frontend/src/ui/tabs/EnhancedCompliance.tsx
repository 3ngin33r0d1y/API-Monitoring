import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, Shield, TrendingUp, AlertCircle } from "lucide-react";
import api from "../../lib/api";

type ApiResponse = {
    service: string;
    version: string;
    url: string;
    status: string;
    environment: string;
    region: string;
};

type ComplianceResult = {
    results: Record<string, ApiResponse>;
    violations: string[];
    compliant: boolean;
    timestamp: string;
};

type EnvironmentData = {
    dev?: ApiResponse;
    uat?: ApiResponse;
    oat?: ApiResponse;
    prod?: ApiResponse;
};

export default function EnhancedCompliance() {
    const [complianceData, setComplianceData] = useState<ComplianceResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const apiEndpoints = {
        prod: "https://vgh0i1c1kodz.manus.space/?code=iTj2RJ7QTxajTb7iT5ygkn",
        oat: "https://qjh9iec7v5y1.manus.space/?code=iTj2RJ7QTxajTb7iT5ygkn",
        uat: "https://77h9ikc60z1m.manus.space/?code=iTj2RJ7QTxajTb7iT5ygkn",
        dev: "https://3dhkilc80jk8.manus.space/?code=iTj2RJ7QTxajTb7iT5ygkn"
    };

    const checkCompliance = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await api.post<ComplianceResult>("/enhanced-proxy/compliance-check", {
                urls: Object.values(apiEndpoints),
                environments: Object.keys(apiEndpoints)
            });
            
            setComplianceData(response.data);
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "Failed to check compliance");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkCompliance();
        const interval = setInterval(checkCompliance, 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const environmentData: EnvironmentData = useMemo(() => {
        if (!complianceData) return {};
        
        return {
            dev: complianceData.results.dev,
            uat: complianceData.results.uat,
            oat: complianceData.results.oat,
            prod: complianceData.results.prod
        };
    }, [complianceData]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-600 bg-green-100';
            case 'offline': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getViolationSeverity = (violation: string) => {
        if (violation.includes('CRITICAL')) return 'critical';
        if (violation.includes('WARNING')) return 'warning';
        return 'info';
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-red-700 bg-red-100 border-red-300';
            case 'warning': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
            default: return 'text-blue-700 bg-blue-100 border-blue-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Shield className="h-8 w-8 text-blue-600" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Version Compliance Dashboard</h1>
                                <p className="text-gray-600 mt-1">Monitor API version compliance across environments</p>
                            </div>
                        </div>
                        <button
                            onClick={checkCompliance}
                            disabled={loading}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                    
                    {lastUpdated && (
                        <p className="text-sm text-gray-500 mt-2">
                            Last updated: {lastUpdated.toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-3">
                            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-lg text-gray-600">Checking compliance...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span className="text-red-800 font-medium">Error</span>
                        </div>
                        <p className="text-red-700 mt-1">{error}</p>
                    </div>
                )}

                {/* Compliance Overview */}
                {complianceData && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Overall Status */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center space-x-3">
                                    {complianceData.compliant ? (
                                        <CheckCircle className="h-8 w-8 text-green-600" />
                                    ) : (
                                        <AlertTriangle className="h-8 w-8 text-red-600" />
                                    )}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Overall Status</h3>
                                        <p className={`text-sm font-medium ${complianceData.compliant ? 'text-green-600' : 'text-red-600'}`}>
                                            {complianceData.compliant ? 'Compliant' : 'Non-Compliant'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Violations Count */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <TrendingUp className="h-8 w-8 text-orange-600" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Violations</h3>
                                        <p className="text-2xl font-bold text-orange-600">{complianceData.violations.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Service Info */}
                            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <Shield className="h-8 w-8 text-blue-600" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Service</h3>
                                        <p className="text-sm text-gray-600">
                                            {environmentData.prod?.service || 'api-name-invoice-job'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Violations List */}
                        {complianceData.violations.length > 0 && (
                            <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                                    <h3 className="text-lg font-semibold text-red-800 flex items-center space-x-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        <span>Compliance Violations</span>
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3">
                                        {complianceData.violations.map((violation, index) => {
                                            const severity = getViolationSeverity(violation);
                                            return (
                                                <div
                                                    key={index}
                                                    className={`p-4 rounded-lg border ${getSeverityColor(severity)}`}
                                                >
                                                    <div className="flex items-start space-x-3">
                                                        <AlertTriangle className="h-5 w-5 mt-0.5" />
                                                        <div>
                                                            <p className="font-medium">{violation}</p>
                                                            <p className="text-sm mt-1 opacity-80">
                                                                This violates the deployment hierarchy requirements.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Environment Comparison Table */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Environment Versions</h3>
                                <p className="text-sm text-gray-600 mt-1">Version comparison across all environments</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {['dev', 'uat', 'oat', 'prod'].map((env) => {
                                            const data = environmentData[env as keyof EnvironmentData];
                                            return (
                                                <tr key={env} className="hover:bg-gray-50 transition-colors duration-150">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            env === 'prod' ? 'bg-red-100 text-red-800' :
                                                            env === 'oat' ? 'bg-orange-100 text-orange-800' :
                                                            env === 'uat' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                        }`}>
                                                            {env.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-mono font-medium text-gray-900">
                                                            {data?.version || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            data ? getStatusColor(data.status) : 'text-gray-600 bg-gray-100'
                                                        }`}>
                                                            {data?.status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {data?.region || 'paris'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                                                        {data?.url || 'N/A'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Expected Hierarchy Info */}
                        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">Expected Version Hierarchy</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-blue-800 mb-2">Deployment Flow</h4>
                                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">DEV</span>
                                        <span>→</span>
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">UAT</span>
                                        <span>→</span>
                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">OAT</span>
                                        <span>→</span>
                                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded">PROD</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-800 mb-2">Compliance Rules</h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• PROD version ≤ OAT version</li>
                                        <li>• PROD version ≤ UAT version</li>
                                        <li>• OAT version ≤ UAT version</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
