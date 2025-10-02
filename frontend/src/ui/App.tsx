import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import Login from "./auth/Login";
import AppShell from "./layout/AppShell";
import { loadSession } from "@/lib/auth";

// Use your existing tab pages if you already have them.
// Here are light placeholders; keep or replace with your real files.
const Dashboard = React.lazy(() => import("./tabs/Dashboard"));
const Compliance = React.lazy(() => import("./tabs/Compliance"));
const Services = React.lazy(() => import("./tabs/Services"));
const AllApis = React.lazy(() => import("./tabs/AllApis"));
const Projects = React.lazy(() => import("./tabs/Projects"));
const ApiDetails = React.lazy(() => import("./tabs/ApiDetails"));

function Protected({ children }: { children: React.ReactNode }) {
    const session = loadSession();
    const loc = useLocation();
    if (!session) {
        return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
    }
    return <>{children}</>;
}

export default function App() {
    const [ready, setReady] = useState(false);
    const nav = useNavigate();
    const loc = useLocation();

    useEffect(() => {
        // If already logged in and sitting on /login, push to home
        const s = loadSession();
        if (s && loc.pathname === "/login") {
            nav("/");
        }
        setReady(true);
    }, [loc.pathname, nav]);

    if (!ready) return null;

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/*"
                element={
                    <Protected>
                        <AppShell>
                            <React.Suspense fallback={<div>Loading…</div>}>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/compliance" element={<Compliance />} />
                                    <Route path="/services" element={<Services />} />
                                    <Route path="/apis" element={<AllApis />} />
                                    <Route path="/projects" element={<Projects />} />
                                    <Route path="/details" element={<ApiDetails />} />
                                </Routes>
                            </React.Suspense>
                        </AppShell>
                    </Protected>
                }
            />
        </Routes>
    );
}
