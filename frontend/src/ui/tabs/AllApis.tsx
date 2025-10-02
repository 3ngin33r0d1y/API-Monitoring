import React, { useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import { Search, Filter, Globe, Server, Zap, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Plus } from 'lucide-react';
import api from "../../lib/api";

/** ===== Types from backend payload ===== */
type ApiRec = {
  id: number;
  projectId: number;
  url: string;
  environment: string;
  region: string;
  status: string;               // online/offline/unknown
  responseTime?: number | null;
  lastChecked?: string | null;
  createdAt?: string;
};

type Project = {
  id: number;
  name: string;
  createdAt: string;
  apis?: ApiRec[];
};

type MetaMap = Record<string, { service?: string; version?: string }>;

type DataPayload = {
  projects: Project[];
  apis?: ApiRec[];              // optional
  allApis?: ApiRec[];           // flattened list if your backend returns it
  apisMeta?: MetaMap;           // { [apiId]: { service, version } }
  fetchedAt?: string;
};

/** ===== UI helpers ===== */
const ENV_ORDER = ["DEV", "UAT", "OAT", "PROD"] as const;
type EnvKey = typeof ENV_ORDER[number];

const normEnv = (e: string): EnvKey => {
  const up = (e || "").toUpperCase();
  if ((ENV_ORDER as readonly string[]).includes(up)) return up as EnvKey;
  if (up.startsWith("PRD") || up.startsWith("PROD")) return "PROD";
  if (up.includes("UAT")) return "UAT";
  if (up.includes("OAT")) return "OAT";
  return "DEV";
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const s = (status || "unknown").toLowerCase();
  let cls =
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  if (s === "online") cls += " bg-green-100 text-green-800 border-green-300";
  else if (s === "offline") cls += " bg-red-100 text-red-800 border-red-300";
  else cls += " bg-gray-100 text-gray-800 border-gray-300";
  return <span className={cls}>{s}</span>;
};

// Modern modal component
const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-white/20">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              <span>{title}</span>
            </h2>
          </div>
          <div className="px-6 py-6">{children}</div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50/50">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AllApis() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  // Add API modal state
  const [addOpen, setAddOpen] = useState(false);
  const [formProjectId, setFormProjectId] = useState<number | null>(null);
  const [formUrl, setFormUrl] = useState("");
  const [formEnv, setFormEnv] = useState<EnvKey>("DEV");
  const [formRegion, setFormRegion] = useState("north");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setAuthErr(null);
    try {
      // Always call the secured API with the preconfigured axios instance
      const res = await api.get<DataPayload>("/data/projects");
      setData(res.data);
      if (formProjectId == null && res.data.projects?.length) {
        setFormProjectId(res.data.projects[0].id);
      }
    } catch (e) {
      const err = e as AxiosError;
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAuthErr("Forbidden (403) — you are not authorized. Please log in again.");
      } else {
        setAuthErr("Failed to load projects. Check server logs.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const t = window.setInterval(fetchAll, 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build one row per service across envs/regions
  const serviceRows = useMemo(() => {
    if (!data) return [];
    const meta = data.apisMeta || {};
    const rowsMap = new Map<
        string,
        { service: string; byEnv: Partial<Record<EnvKey, Record<string, { version?: string; url: string; status: string }>>> }
    >();

    const list = (data.allApis?.length ? data.allApis : data.apis) || [];

    for (const a of list) {
      const m = meta[String(a.id)] || {};
      let service = m.service;
      if (!service) {
        try {
          service = new URL(a.url).hostname;
        } catch {
          service = "unknown-service";
        }
      }
      const env = normEnv(a.environment);
      const row = rowsMap.get(service) || { service, byEnv: {} };
      const envBucket = row.byEnv[env] || {};
      envBucket[a.region] = {
        version: m.version,
        url: a.url,
        status: a.status || "unknown",
      };
      row.byEnv[env] = envBucket;
      rowsMap.set(service, row);
    }
    return Array.from(rowsMap.values()).sort((x, y) =>
        x.service.localeCompare(y.service)
    );
  }, [data]);

  /** Add API: validate URL -> save -> trigger backend check -> refresh */
  const handleAdd = async () => {
    if (!formProjectId || !formUrl) return;
    setSaving(true);
    try {
      // 1) Validate URL and read JSON for version/service
      const probe = await axios.get(formUrl, { timeout: 8000 });
      const { version, service } = probe.data || {};
      if (!version || !service) {
        alert('The endpoint must return JSON like: {"version":"1.0.0","service":"api-name"}');
        setSaving(false);
        return;
      }

      // 2) Save API (backend will ignore unknown fields if not mapped)
      await api.post(`/data/projects/${formProjectId}/apis`, {
        url: formUrl.trim(),
        environment: formEnv,
        region: formRegion,
        version,
        service,
      });

      // 3) Ask backend to check status/response time (best-effort)
      try {
        await api.post("/proxy/check", { url: formUrl.trim() });
      } catch {
        /* optional */
      }

      setAddOpen(false);
      setFormUrl("");
      fetchAll();
    } catch (e) {
      const err = e as AxiosError;
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Unauthorized. Please log in again.");
      } else {
        alert("URL check or save failed. Ensure the URL is reachable and returns the required JSON.");
      }
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl">
                <Server className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  All APIs
                </h1>
                <p className="text-gray-600 text-sm">Monitor and manage all your API endpoints</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                <Server className="h-4 w-4" />
                <span>{serviceRows.length} Services</span>
              </div>
              <button
                onClick={() => setAddOpen(true)}
                disabled={!!authErr}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">Add API</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {authErr && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Authentication Error</h3>
                <p className="text-red-700 mt-1">{authErr}</p>
                <p className="text-sm text-red-600 mt-2">Make sure your login saves a JWT into localStorage["token"].</p>
              </div>
            </div>
          </div>
        )}

        {/* Services Overview */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Service Matrix</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {loading
                    ? "Refreshing services..."
                    : `Last updated ${data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : ""}`}
                </p>
              </div>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-[1.2fr,1fr,1fr,1fr,1fr] gap-0 border border-gray-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 font-semibold bg-gradient-to-r from-gray-100 to-gray-200 border-r border-gray-300 flex items-center">
                  <Server className="h-4 w-4 mr-2 text-gray-600" />
                  Service
                </div>
                {ENV_ORDER.map((e) => (
                  <div key={e} className="px-4 py-3 font-semibold bg-gradient-to-r from-gray-100 to-gray-200 border-r border-gray-300 text-center last:border-r-0">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      e === 'PROD' ? 'bg-red-100 text-red-800' :
                      e === 'OAT' ? 'bg-orange-100 text-orange-800' :
                      e === 'UAT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {e}
                    </span>
                  </div>
                ))}

                {/* Rows */}
                {serviceRows.map((r, index) => (
                  <React.Fragment key={r.service}>
                    <div className={`px-4 py-4 border-r border-gray-200 flex items-center ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded">
                          <Globe className="h-3 w-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">{r.service}</span>
                      </div>
                    </div>
                    {ENV_ORDER.map((e) => {
                      const cells = r.byEnv[e] || {};
                      const regions = Object.keys(cells);
                      return (
                        <div key={`${r.service}-${e}`} className={`px-4 py-4 border-r border-gray-200 last:border-r-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          {regions.length > 0 ? (
                            <div className="space-y-3">
                              {regions.map((region) => {
                                const cell = cells[region]!;
                                return (
                                  <div key={region} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600 uppercase">{region}</span>
                                      <StatusBadge status={cell.status} />
                                    </div>
                                    <div className="text-sm font-mono text-gray-900 mb-1">v{cell.version || "?"}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[180px] mb-2">{cell.url}</div>
                                    <a
                                      href={cell.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      <span>Test</span>
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-gray-400 text-sm italic">No deployment</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}

                {!loading && serviceRows.length === 0 && (
                  <div className="col-span-5 px-6 py-12 text-center bg-gray-50/50">
                    <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-lg font-medium text-gray-900 mb-2">No APIs Yet</div>
                    <div className="text-sm text-gray-500 mb-4">Get started by adding your first API endpoint</div>
                    <button
                      onClick={() => setAddOpen(true)}
                      disabled={!!authErr}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add First API</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Add API Modal */}
        <Modal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title="Add an API"
          footer={
            <>
              <button
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 font-medium"
                disabled={!formProjectId || !formUrl || saving}
                onClick={handleAdd}
              >
                {saving ? "Saving…" : "Save API"}
              </button>
            </>
          }
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={formProjectId?.toString() || ""}
                onChange={(e) => setFormProjectId(parseInt(e.target.value, 10))}
              >
                <option value="" disabled>
                  Select project
                </option>
                {(data?.projects || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API URL</label>
              <input
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="https://api.example.com/health"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2 bg-blue-50 p-2 rounded-lg">
                <strong>Required:</strong> Endpoint must return <code className="bg-white px-1 rounded">{"{ \"version\": \"x.y.z\", \"service\": \"name\" }"}</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                <select
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={formRegion}
                  onChange={(e) => setFormRegion(e.target.value)}
                >
                  <option value="north">North</option>
                  <option value="paris">Paris</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                <select
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={formEnv}
                  onChange={(e) => setFormEnv(e.target.value as EnvKey)}
                >
                  {ENV_ORDER.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
