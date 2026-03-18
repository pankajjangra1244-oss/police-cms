'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { BarChart3, MapPin, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';

// Leaflet must be loaded client-side only
const HotspotMap = dynamic(() => import('@/components/HotspotMap'), { ssr: false, loading: () => (
  <div className="h-80 bg-navy-800/60 rounded-2xl flex items-center justify-center">
    <p className="text-slate-500 text-sm">Loading map...</p>
  </div>
)});

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-navy-700 border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl">
        <p className="text-white font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill || p.stroke }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [byType, setByType] = useState<any[]>([]);
  const [byMonth, setByMonth] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      analyticsAPI.summary(),
      analyticsAPI.byType(),
      analyticsAPI.byMonth(),
      analyticsAPI.byStatus(),
      analyticsAPI.hotspots(),
      analyticsAPI.insights(),
    ]).then(([sum, type, month, status, spots, ins]) => {
      if (sum.status === 'fulfilled') setSummary(sum.value.data);
      if (type.status === 'fulfilled') setByType(type.value.data);
      if (month.status === 'fulfilled') setByMonth(month.value.data);
      if (status.status === 'fulfilled') setByStatus(status.value.data.map((s: any) => ({ ...s, name: s.status.replace('_', ' '), count: parseInt(s.count) })));
      if (spots.status === 'fulfilled') setHotspots(spots.value.data);
      if (ins.status === 'fulfilled') setInsights(ins.value.data.insights || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-navy-700 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-navy-700 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-72 bg-navy-700 rounded-2xl" />
        <div className="h-72 bg-navy-700 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">Crime Analytics Dashboard</h1>
        <p className="page-subtitle">AI-powered crime trend analysis and patrol recommendations</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: summary?.total ?? 0, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Pending', value: summary?.pending ?? 0, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Investigating', value: summary?.investigating ?? 0, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
          { label: 'Resolved', value: summary?.resolved ?? 0, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
        ].map(({ label, value, color }) => (
          <div key={label} className={clsx('glass-card p-5 border', color)}>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Monthly Crime Trend
          </h2>
          {byMonth.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-500 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" name="Complaints" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Incident Type */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" /> Crimes by Type
          </h2>
          {byType.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-500 text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="incident_type" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Cases" radius={[0, 4, 4, 0]}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" /> Status Distribution
          </h2>
          {byStatus.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byStatus} cx="50%" cy="50%" outerRadius={70} dataKey="count" nameKey="name">
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {byStatus.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-400 capitalize">{s.name}</span>
                    </div>
                    <span className="text-white font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI Insights */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> AI Patrol Recommendations
          </h2>
          {insights.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">Register more complaints to generate AI insights</p>
          ) : (
            <div className="space-y-4">
              {insights.map((ins, i) => (
                <div key={i} className={clsx(
                  'p-4 rounded-xl border',
                  ins.priority === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                  ins.priority === 'high' ? 'bg-orange-500/10 border-orange-500/20' :
                  'bg-blue-500/10 border-blue-500/20'
                )}>
                  <p className="text-white font-semibold text-sm mb-1">{ins.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{ins.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hotspot Map */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-400" /> Crime Hotspot Map
        </h2>
        <HotspotMap hotspots={hotspots} />
        {hotspots.length === 0 && (
          <p className="text-center text-slate-500 text-sm mt-4">Add GPS coordinates to complaints to see hotspots</p>
        )}
      </div>
    </div>
  );
}
