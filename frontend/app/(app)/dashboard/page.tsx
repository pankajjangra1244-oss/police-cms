'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { analyticsAPI, complaintsAPI } from '@/lib/api';
import {
  FileText, Clock, CheckCircle, AlertTriangle, TrendingUp,
  PlusCircle, BarChart3, Shield, ArrowRight, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'badge-pending' },
  under_investigation: { label: 'Investigating', cls: 'badge-active' },
  resolved: { label: 'Resolved', cls: 'badge-resolved' },
  closed: { label: 'Closed', cls: 'badge-closed' },
  rejected: { label: 'Rejected', cls: 'badge-critical' },
};

const PRIORITY_MAP: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, cmpRes, insRes] = await Promise.allSettled([
          analyticsAPI.summary(),
          complaintsAPI.list({ limit: 5, page: 1 }),
          analyticsAPI.insights(),
        ]);
        if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
        if (cmpRes.status === 'fulfilled') setComplaints(cmpRes.value.data.complaints || []);
        if (insRes.status === 'fulfilled') setInsights(insRes.value.data.insights || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { label: 'Total Cases', value: summary?.total ?? 0, icon: FileText, color: 'from-blue-600/20 to-blue-800/10', iconColor: 'text-blue-400', border: 'border-blue-500/20' },
    { label: 'Pending', value: summary?.pending ?? 0, icon: Clock, color: 'from-yellow-600/20 to-yellow-800/10', iconColor: 'text-yellow-400', border: 'border-yellow-500/20' },
    { label: 'Under Investigation', value: summary?.investigating ?? 0, icon: Activity, color: 'from-purple-600/20 to-purple-800/10', iconColor: 'text-purple-400', border: 'border-purple-500/20' },
    { label: 'Resolved', value: summary?.resolved ?? 0, icon: CheckCircle, color: 'from-green-600/20 to-green-800/10', iconColor: 'text-green-400', border: 'border-green-500/20' },
    { label: 'This Month', value: summary?.this_month ?? 0, icon: TrendingUp, color: 'from-cyan-600/20 to-cyan-800/10', iconColor: 'text-cyan-400', border: 'border-cyan-500/20' },
  ];

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-8 w-48 bg-navy-700 rounded-lg mb-2 animate-pulse" />
        <div className="h-4 w-64 bg-navy-700/60 rounded mb-8 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-navy-700 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-80 bg-navy-700 rounded-2xl animate-pulse" />
          <div className="h-80 bg-navy-700 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="page-subtitle">Real-time overview of case management activities</p>
        </div>
        <Link href="/complaints/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" />
          New Complaint
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, iconColor, border }) => (
          <div key={label} className={clsx('stat-card bg-gradient-to-br border', color, border)}>
            <div className="flex items-start justify-between mb-3">
              <div className={clsx('w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center', iconColor)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Complaints */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Recent Complaints
            </h2>
            <Link href="/complaints" className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {complaints.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No complaints registered yet</p>
              <Link href="/complaints/new" className="text-blue-400 text-xs mt-2 inline-block hover:text-blue-300">Register first complaint →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <Link key={c.id} href={`/complaints/${c.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-navy-800/60 hover:bg-navy-700/60 border border-white/5 hover:border-white/10 transition-all duration-200 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium truncate">{c.complainant_name}</span>
                      <span className={clsx('badge text-[10px]', PRIORITY_MAP[c.priority])}>{c.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="truncate">{c.incident_type}</span>
                      <span>·</span>
                      <span className="truncate">{c.location || 'No location'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={clsx('badge text-[10px]', STATUS_MAP[c.status]?.cls)}>{STATUS_MAP[c.status]?.label}</span>
                    <span className="text-[10px] text-slate-600">{format(new Date(c.created_at), 'dd MMM')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-5">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> AI Patrol Insights
          </h2>
          {insights.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Not enough data for insights yet</p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className={clsx(
                  'p-3 rounded-xl border text-sm',
                  insight.priority === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                  insight.priority === 'high' ? 'bg-orange-500/10 border-orange-500/20' :
                  'bg-blue-500/10 border-blue-500/20'
                )}>
                  <p className="text-white font-medium text-xs mb-1">{insight.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/analytics" className="flex items-center justify-center gap-2 mt-5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <BarChart3 className="w-3 h-3" /> Full Analytics →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/complaints/new', icon: PlusCircle, label: 'Register Complaint', color: 'text-blue-400' },
            { href: '/complaints', icon: FileText, label: 'View All Cases', color: 'text-purple-400' },
            { href: '/evidence', icon: Shield, label: 'Upload Evidence', color: 'text-green-400' },
            { href: '/analytics', icon: BarChart3, label: 'View Analytics', color: 'text-yellow-400' },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-navy-800/60 hover:bg-navy-700/60 border border-white/5 hover:border-white/10 transition-all duration-200 hover:scale-[1.02] group text-center">
              <div className={clsx('w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center', color)}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
