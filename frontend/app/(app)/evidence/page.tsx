'use client';

import { useEffect, useState, useCallback } from 'react';
import { uploadsAPI, complaintsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Image, Film, Music, FileText, Trash2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime?.startsWith('image')) return <Image className="w-5 h-5 text-blue-400" />;
  if (mime?.startsWith('video')) return <Film className="w-5 h-5 text-purple-400" />;
  if (mime?.startsWith('audio')) return <Music className="w-5 h-5 text-green-400" />;
  if (mime === 'application/pdf') return <FileText className="w-5 h-5 text-orange-400" />;
  return <File className="w-5 h-5 text-slate-400" />;
}

export default function EvidencePage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [evidence, setEvidence] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  useEffect(() => {
    complaintsAPI.list({ limit: 100 }).then(r => {
      setComplaints(r.data.complaints || []);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) { setEvidence([]); return; }
    setLoadingEvidence(true);
    uploadsAPI.list(selectedId).then(r => setEvidence(r.data || [])).finally(() => setLoadingEvidence(false));
  }, [selectedId]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!selectedId) { toast.error('Select a complaint first'); return; }
    setUploading(true);
    try {
      await uploadsAPI.upload(selectedId, files);
      const res = await uploadsAPI.list(selectedId);
      setEvidence(res.data);
      toast.success(`${files.length} file(s) uploaded!`);
    } catch (err: any) { 
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      toast.error(msg);
    }
    finally { setUploading(false); }
  }, [selectedId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [], 'video/*': [], 'audio/*': [], 'application/pdf': [] },
    maxSize: 50 * 1024 * 1024, disabled: !selectedId || uploading,
  });

  const handleDelete = async (fileId: string) => {
    try {
      await uploadsAPI.delete(fileId);
      setEvidence(ev => ev.filter(e => e.id !== fileId));
      toast.success('File deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="page-title">Evidence Management</h1>
        <p className="page-subtitle">Upload and manage multimedia evidence for complaints</p>
      </div>

      {/* Complaint Selector */}
      <div className="glass-card p-5">
        <label className="label flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Select Complaint
        </label>
        <div className="relative">
          <select className="input-field appearance-none pr-10"
            value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">-- Choose a complaint --</option>
            {complaints.map(c => (
              <option key={c.id} value={c.id}>
                {c.complaint_number} — {c.complainant_name} ({c.incident_type})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className={clsx(
        'glass-card p-10 text-center cursor-pointer border-2 border-dashed transition-all duration-200',
        isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/40 hover:bg-white/[0.02]',
        (!selectedId || uploading) && 'opacity-50 cursor-not-allowed'
      )}>
        <input {...getInputProps()} />
        <Upload className={clsx('w-10 h-10 mx-auto mb-4', isDragActive ? 'text-blue-400 animate-bounce' : 'text-slate-600')} />
        {uploading ? (
          <p className="text-blue-400 font-medium">Uploading files...</p>
        ) : isDragActive ? (
          <p className="text-blue-400 font-medium">Drop files here!</p>
        ) : (
          <>
            <p className="text-white font-medium mb-1">{selectedId ? 'Drag files here or click to upload' : 'Select a complaint above first'}</p>
            <p className="text-slate-500 text-sm">Photos, Videos, Audio, PDF — Max 50MB per file</p>
          </>
        )}
      </div>

      {/* Evidence List */}
      {selectedId && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-4">
            Attached Evidence {evidence.length > 0 && <span className="text-slate-500 text-sm">({evidence.length})</span>}
          </h2>
          {loadingEvidence ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-navy-700/60 rounded-xl animate-pulse" />)}
            </div>
          ) : evidence.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-10">No evidence uploaded for this complaint yet</p>
          ) : (
            <div className="space-y-3">
              {evidence.map(f => (
                <div key={f.id} className="flex items-center gap-4 p-4 bg-navy-800/60 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                  <FileTypeIcon mime={f.mime_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{f.mime_type} • {(f.file_size / 1024).toFixed(1)} KB • {format(new Date(f.uploaded_at), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={f.file_path?.startsWith('http') ? f.file_path : `https://police-cms.onrender.com/${f.file_path}`} 
                      target="_blank" rel="noopener noreferrer"
                      className="btn-secondary py-1.5 px-3 text-xs">View</a>
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
