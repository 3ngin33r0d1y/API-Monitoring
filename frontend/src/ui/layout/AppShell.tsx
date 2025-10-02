import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearSession, loadSession } from "@/lib/auth";
import { post } from "@/lib/api";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const nav = useNavigate();
    const user = loadSession();

    async function onLogout() {
        try {
            await post("/auth/logout");
        } catch { /* ignore */ }
        clearSession();
        nav("/login");
    }

    return (
        <div className="min-h-screen grid grid-cols-[240px_1fr]">
            <aside className="border-r bg-white">
                <div className="p-4 border-b">
                    <div className="font-semibold">API Monitoring</div>
                    <div className="text-xs text-gray-500">Signed in as {user?.username}</div>
                </div>
                <nav className="p-2 space-y-1">
                    {[
                        { to: "/", label: "Dashboard" },
                        { to: "/compliance", label: "Compliance" },
                        { to: "/services", label: "Services" },
                        { to: "/apis", label: "All APIs" },
                        { to: "/projects", label: "Projects" },
                        { to: "/details", label: "API Details" },
                    ].map((i) => (
                        <NavLink
                            key={i.to}
                            to={i.to}
                            end={i.to === "/"}
                            className={({ isActive }) =>
                                "block rounded px-3 py-2 text-sm " + (isActive ? "bg-black text-white" : "hover:bg-gray-100")
                            }
                        >
                            {i.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-2 mt-auto">
                    <button onClick={onLogout} className="w-full rounded border px-3 py-2 text-sm hover:bg-gray-50">
                        Logout
                    </button>
                </div>
            </aside>
            <main className="p-4 bg-gray-50">{children}</main>
        </div>
    );
}
