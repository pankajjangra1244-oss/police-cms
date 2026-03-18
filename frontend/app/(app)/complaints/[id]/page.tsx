'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { complaintsAPI, uploadsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Edit2, Save, X, MapPin, Phone, User, Calendar,
  FileText, Image, Film, Music, File, Trash2, Upload, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import clsx from 'clsx';

const STATUSES = ['pending', 'under_investigation', 'resolved', 'closed', 'rejected'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', under_investigation: 'Under Investigation',
  resolved: 'Resolved', closed: 'Closed', rejected: 'Rejected'
};
const STATUS_MAP: Record<string, string> = {
  pending: 'badge-pending', under_investigation: 'badge-active',
  resolved: 'badge-resolved', closed: 'badge-closed', rejected: 'badge-critical'
};

function FileIcon({ type }: { type: string }) {
  if (type === 'image') return <Image className="w-4 h-4 text-blue-400" />;
  if (type === 'video') return <Film className="w-4 h-4 text-purple-400" />;
  if (type === 'audio') return <Music className="w-4 h-4 text-green-400" />;
  return <File className="w-4 h-4 text-orange-400" />;
}

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    complaintsAPI.get(id).then(res => {
      setComplaint(res.data);
      setEvidence(res.data.evidence || []);
      setEditStatus(res.data.status);
      setEditNotes(res.data.description || '');
    }).catch(() => toast.error('Complaint not found')).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    try {
      await complaintsAPI.update(id, { status: editStatus, description: editNotes });
      setComplaint((c: any) => ({ ...c, status: editStatus, description: editNotes }));
      setEditing(false);
      toast.success('Complaint updated successfully');
    } catch { toast.error('Failed to update complaint'); }
  };

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    try {
      await uploadsAPI.upload(id, Array.from(files));
      const res = await uploadsAPI.list(id);
      setEvidence(res.data);
      toast.success('Evidence uploaded!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await uploadsAPI.delete(fileId);
      setEvidence(ev => ev.filter(e => e.id !== fileId));
      toast.success('File removed');
    } catch { toast.error('Delete failed'); }
  };

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-navy-700 rounded-lg" />
      <div className="glass-card p-6 h-64 bg-navy-700 rounded-2xl" />
    </div>
  );

  if (!complaint) return <div className="glass-card p-12 text-center text-slate-400">Complaint not found</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-secondary py-2 px-3">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{complaint.complaint_number}</h1>
            <span className={clsx('badge', STATUS_MAP[complaint.status])}>{STATUS_LABELS[complaint.status]}</span>
          </div>
          <p className="page-subtitle">Registered {format(new Date(complaint.created_at), 'dd MMMM yyyy, hh:mm a')}</p>
        </div>
        <button className="btn-secondary py-2" onClick={() => setEditing(!editing)}>
          {editing ? <><X className="w-4 h-4" />Cancel</> : <><Edit2 className="w-4 h-4" />Edit</>}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> Complainant Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: User, label: 'Name', value: complaint.complainant_name },
                { icon: Phone, label: 'Mobile', value: complaint.mobile || '—' },
                { icon: FileText, label: 'Incident Type', value: complaint.incident_type },
                { icon: Clock, label: 'Priority', value: complaint.priority },
                { icon: Calendar, label: 'Incident Date', value: complaint.date_time ? format(new Date(complaint.date_time), 'dd MMM yyyy, hh:mm a') : '—' },
                { icon: MapPin, label: 'Location', value: complaint.location || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Icon className="w-3 h-3" /> {label}
                  </p>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Description
            </h2>
            {editing ? (
              <textarea className="input-field resize-y w-full" rows={6}
                value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            ) : (
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {complaint.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Evidence */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" /> Evidence ({evidence.length})
              </h2>
              <label className={clsx('btn-secondary py-2 px-4 cursor-pointer text-xs', uploading && 'opacity-50 cursor-wait')}>
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Add Files'}
                <input type="file" multiple className="hidden" accept="image/*,video/*,audio/*,.pdf"
                  onChange={e => e.target.files && handleFileUpload(e.target.files)} disabled={uploading} />
              </label>
            </div>
            {evidence.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-8">No evidence attached yet</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {evidence.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-navy-800/60 rounded-xl border border-white/5 group">
                    <FileIcon type={f.file_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{f.file_name}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{f.file_type} • {(f.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`/uploads/${f.file_path}`} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs">View</a>
                      <button onClick={() => handleDeleteFile(f.id)} className="text-red-400 hover:text-red-300 ml-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-5">
          {/* Status Update */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Update Status</h3>
            <div className="space-y-2">
              {STATUSES.map(s => (
                <button key={s} onClick={() => { setEditStatus(s); setEditing(true); }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all',
                    editStatus === s
                      ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                      : 'bg-navy-800/60 border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  )}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0',
                    s === 'pending' ? 'bg-yellow-400' :
                    s === 'under_investigation' ? 'bg-blue-400' :
                    s === 'resolved' ? 'bg-green-400' :
                    s === 'closed' ? 'bg-slate-400' : 'bg-red-400'
                  )} />
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {editing && (
              <button onClick={handleSave} className="btn-primary w-full mt-4 py-2.5 text-sm">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            )}
          </div>

          {/* Officer Info */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3 text-sm">Assigned Officer</h3>
            <p className="text-white text-sm">{complaint.officer_name || '—'}</p>
            {complaint.badge_number && <p className="text-slate-500 text-xs mt-1">Badge: {complaint.badge_number}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
