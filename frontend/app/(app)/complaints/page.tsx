'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { complaintsAPI } from '@/lib/api';
import { Search, Filter, PlusCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const STATUSES = ['', 'pending', 'under_investigation', 'resolved', 'closed', 'rejected'];
const INCIDENT_TYPES = ['', 'Theft', 'Robbery', 'Assault', 'Fraud', 'Burglary', 'Vandalism', 'Harassment', 'Domestic Violence', 'Accident', 'Missing Person', 'Cyber Crime', 'Drug Trafficking', 'Vehicle Theft', 'Other'];

const STATUS_MAP: Record<string, string> = {
  pending: 'badge-pending', under_investigation: 'badge-active',
  resolved: 'badge-resolved', closed: 'badge-closed', rejected: 'badge-critical',
};
const PRIORITY_MAP: Record<string, string> = {
  critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low',
};

export default function ComplaintsListPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', status: '', incident_type: '' });
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const res = await complaintsAPI.list(params);
      setComplaints(res.data.complaints);
      setPagination(res.data.pagination);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComplaints(1); }, [filters]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Complaint Registry</h1>
          <p className="page-subtitle">{pagination.total} total complaint{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/complaints/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> New Complaint
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="input-field pl-10 py-2.5" placeholder="Search complaints..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <select className="input-field pl-9 py-2.5 pr-8 appearance-none min-w-36"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All Status'}</option>)}
          </select>
        </div>
        <select className="input-field py-2.5 pr-8 appearance-none min-w-44"
          value={filters.incident_type}
          onChange={e => setFilters(f => ({ ...f, incident_type: e.target.value }))}>
          {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Complaint No.', 'Complainant', 'Type', 'Location', 'Date', 'Priority', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-navy-700/60 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No complaints found</p>
                </td></tr>
              ) : (
                complaints.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-400 text-xs">{c.complaint_number}</td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{c.complainant_name}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.incident_type}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-32 truncate">{c.location || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{format(new Date(c.created_at), 'dd MMM yy')}</td>
                    <td className="px-4 py-3"><span className={clsx('badge text-[10px]', PRIORITY_MAP[c.priority])}>{c.priority}</span></td>
                    <td className="px-4 py-3"><span className={clsx('badge text-[10px]', STATUS_MAP[c.status])}>{c.status?.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3">
                      <Link href={`/complaints/${c.id}`} className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">View →</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex items-center gap-2">
              <button className="btn-secondary py-1.5 px-3 text-xs" disabled={pagination.page <= 1}
                onClick={() => fetchComplaints(pagination.page - 1)}>
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <button className="btn-secondary py-1.5 px-3 text-xs" disabled={pagination.page >= pagination.pages}
                onClick={() => fetchComplaints(pagination.page + 1)}>
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
