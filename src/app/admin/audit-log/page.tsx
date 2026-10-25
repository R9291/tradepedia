"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ArrowLeft, Shield, Search } from "lucide-react";

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.logs) {
          setLogs(data.data.logs);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 mb-2 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Overview
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-slate-300" />
          Administrative & Security Audit Logs
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event log of all administrator actions, balance modifications, KYC decisions, and user authentications.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No audit records currently available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor ID</th>
                  <th className="px-6 py-3">Action Verb</th>
                  <th className="px-6 py-3">Entity Type</th>
                  <th className="px-6 py-3">Target Entity ID</th>
                  <th className="px-6 py-3">Metadata / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 font-mono">
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap font-sans">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {log.actorId ? log.actorId.slice(-8) : "SYSTEM"}
                    </td>
                    <td className="px-6 py-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-purple-300 border border-purple-800/40">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-300 font-sans">{log.entityType}</td>
                    <td className="px-6 py-3 text-slate-400">
                      {log.entityId ? log.entityId.slice(-8) : "N/A"}
                    </td>
                    <td className="px-6 py-3 font-sans text-slate-300 text-[11px] max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
