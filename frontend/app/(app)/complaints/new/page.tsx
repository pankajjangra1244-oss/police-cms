'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { complaintsAPI, aiAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, FileText, MapPin, Phone, User, Calendar, AlertCircle,
  ChevronDown, Sparkles, Upload, X, Loader, Locate
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import clsx from 'clsx';
import axios from 'axios';
import statesData from '@/lib/states.json';

const INCIDENT_TYPES = [
  'Theft', 'Robbery', 'Assault', 'Murder', 'Fraud', 'Burglary',
  'Vandalism', 'Harassment', 'Domestic Violence', 'Accident',
  'Missing Person', 'Cyber Crime', 'Drug Trafficking', 'Vehicle Theft',
  'Chain Snatching', 'Extortion', 'Arson', 'Kidnapping', 'Other'
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

interface FormData {
  complainant_name: string;
  mobile: string;
  incident_type: string;
  date_time: string;
  location: string;
  state: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  priority: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const Field = ({ id, label, icon: Icon, children }: any) => (
  <div>
    <label htmlFor={id} className="label flex items-center gap-1.5">
      <Icon className="w-3 h-3" />
      {label}
    </label>
    {children}
  </div>
);

export default function NewComplaintPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    complainant_name: '', mobile: '', incident_type: '',
    date_time: new Date().toISOString().slice(0, 16),
    location: '', state: '', district: '', latitude: null, longitude: null, description: '', priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recognition
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser. Use Chrome or Edge.');
      return;
    }

    if (recording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error(e);
      }
      setRecording(false);
      setTranscript('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (finalChunk.trim()) {
          setForm(f => ({
            ...f,
            description: f.description ? f.description.trim() + ' ' + finalChunk.trim() : finalChunk.trim()
          }));
        }
        setTranscript(interim); // Only hold the temporary unfinalized words
      };

      recognition.onend = () => {
        setRecording(false);
        setTranscript('');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        setRecording(false);
        setTranscript('');
        if (event.error !== 'no-speech') {
          toast.error('Microphone error or permission denied');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
      toast.success('Listening... Speak your complaint');
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setRecording(false);
      toast.error('Failed to start microphone');
    }
  };

  // NLP Auto-Extract
  const handleExtract = async () => {
    const text = form.description || transcript;
    if (!text.trim()) {
      toast.error('Enter or speak a complaint description first');
      return;
    }
    setExtracting(true);
    try {
      const res = await aiAPI.extract(text);
      const { extracted } = res.data;
      setForm(f => ({
        ...f,
        complainant_name: extracted.complainant_name || f.complainant_name,
        mobile: extracted.mobile || f.mobile,
        incident_type: extracted.incident_type || f.incident_type,
        location: extracted.location || f.location,
        date_time: extracted.date ? extracted.date + 'T00:00' : f.date_time,
      }));
      toast.success('AI extracted complaint details!');
    } catch {
      toast.error('AI extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  // OCR Upload
  const handleOCR = async (file: File) => {
    setOcrFile(file);
    setOcrLoading(true);
    toast.loading('Running OCR...', { id: 'ocr' });
    try {
      const result = await Tesseract.recognize(file, 'eng', { logger: () => {} });
      const text = result.data.text;
      setForm(f => ({ ...f, description: f.description ? f.description + '\n' + text : text }));
      toast.success('Text extracted from document!', { id: 'ocr' });
    } catch {
      toast.error('OCR failed', { id: 'ocr' });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.complainant_name || !form.incident_type) {
      toast.error('Complainant name and incident type are required');
      return;
    }
    setLoading(true);
    try {
      const res = await complaintsAPI.create(form);
      toast.success(`Complaint ${res.data.complaint_number} registered!`);
      router.push(`/complaints/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to register complaint');
    } finally {
      setLoading(false);
    }
  };



  const handleGetLocation = async () => {
    if (!form.location.trim() && !form.district && !form.state) {
      toast.error('Please enter a location, district, or state first');
      return;
    }
    setLocating(true);
    toast.loading('Finding coordinates for typed location...', { id: 'gps' });
    try {
      const fullLocation = [form.location, form.district, form.state, 'India'].filter(Boolean).join(', ');
      
      // First attempt with full string
      let res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: fullLocation, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'PoliceCMS-CaseManagementApp/1.0 (admin@policecms.gov)' }
      });

      // Valid fallback if full string gives nothing
      if (!res.data || res.data.length === 0) {
        const fallbackQuery = [form.district, form.state, 'India'].filter(Boolean).join(', ');
        res = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: fallbackQuery, format: 'json', limit: 1 },
          headers: { 'User-Agent': 'PoliceCMS-CaseManagementApp/1.0 (admin@policecms.gov)' }
        });
      }

      if (res.data && res.data.length > 0) {
        const lat = parseFloat(res.data[0].lat);
        const lon = parseFloat(res.data[0].lon);
        setForm(f => ({ ...f, latitude: lat, longitude: lon }));
        toast.success('Coordinates found for typed location!', { id: 'gps' });
      } else {
        toast.error('Could not map this exact location. The backend will try again on submit.', { id: 'gps' });
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
      toast.error('Failed to get coordinates from map service.', { id: 'gps' });
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="page-title">Register New Complaint</h1>
        <p className="page-subtitle">Use voice input or OCR to auto-fill complaint details</p>
      </div>

      {/* AI Input Options */}
      <div className="glass-card p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> AI-Powered Input
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Voice Button */}
          <button type="button" onClick={toggleVoice}
            className={clsx(
              'flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200',
              recording
                ? 'bg-red-600 text-white mic-recording border border-red-400/30'
                : 'bg-navy-800 hover:bg-navy-700 text-slate-300 border border-white/10'
            )}>
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {recording ? 'Stop Recording' : 'Voice Input'}
          </button>

          {/* OCR Upload */}
          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={ocrLoading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm bg-navy-800 hover:bg-navy-700 text-slate-300 border border-white/10 transition-all duration-200 disabled:opacity-50">
            {ocrLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {ocrLoading ? 'Extracting...' : 'Upload Document (OCR)'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf"
            onChange={(e) => e.target.files?.[0] && handleOCR(e.target.files[0])} />

          {/* AI Extract */}
          <button type="button" onClick={handleExtract} disabled={extracting}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all duration-200 disabled:opacity-50">
            {extracting ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Autofill Fields
          </button>

          {ocrFile && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
              <FileText className="w-3 h-3" />
              {ocrFile.name}
              <button onClick={() => setOcrFile(null)}><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>
        {recording && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block flex-shrink-0" />
            <span className="font-medium">
              {transcript ? <><span className="text-red-400">Hearing:</span> "{transcript}"</> : 'Listening... Speak clearly into your microphone'}
            </span>
          </div>
        )}
      </div>

      {/* Complaint Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <p className="text-sm font-semibold text-white mb-2">Complaint Details</p>

        <div className="grid md:grid-cols-2 gap-5">
          <Field id="complainant_name" label="Complainant Name *" icon={User}>
            <input id="complainant_name" className="input-field"
              placeholder="Full name of complainant"
              value={form.complainant_name}
              onChange={e => setForm({ ...form, complainant_name: e.target.value })} />
          </Field>

          <Field id="mobile" label="Mobile Number" icon={Phone}>
            <input id="mobile" className="input-field" type="tel"
              placeholder="+91 XXXXXXXXXX"
              value={form.mobile}
              maxLength={13}
              onChange={e => setForm({ ...form, mobile: e.target.value })} />
          </Field>

          <Field id="incident_type" label="Incident Type *" icon={AlertCircle}>
            <div className="relative">
              <select id="incident_type" className="input-field appearance-none pr-10"
                value={form.incident_type}
                onChange={e => setForm({ ...form, incident_type: e.target.value })}>
                <option value="">Select incident type</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </Field>

          <Field id="priority" label="Priority Level" icon={AlertCircle}>
            <div className="relative">
              <select id="priority" className="input-field appearance-none pr-10"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </Field>

          <Field id="date_time" label="Date & Time of Incident" icon={Calendar}>
            <input id="date_time" className="input-field" type="datetime-local"
              value={form.date_time}
              onChange={e => setForm({ ...form, date_time: e.target.value })} />
          </Field>
          
          <Field id="state" label="State/UT *" icon={MapPin}>
            <div className="relative">
              <select id="state" className="input-field appearance-none pr-10"
                value={form.state}
                onChange={e => setForm({ ...form, state: e.target.value, district: '', latitude: null, longitude: null })}>
                <option value="">Select State</option>
                {statesData.states.map((s: any) => <option key={s.state} value={s.state}>{s.state}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </Field>

          <Field id="district" label="District *" icon={MapPin}>
            <div className="relative">
              <select id="district" className="input-field appearance-none pr-10"
                value={form.district}
                onChange={e => setForm({ ...form, district: e.target.value, latitude: null, longitude: null })}
                disabled={!form.state}>
                <option value="">Select District</option>
                {statesData.states.find((s: any) => s.state === form.state)?.districts.map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </Field>

          <Field id="location" label="Local Area & Map Coordinates" icon={MapPin}>
            <div className="flex gap-2">
              <input id="location" className="input-field flex-1"
                placeholder="Village, street, landmark..."
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value, latitude: null, longitude: null })} />
              <button 
                type="button" 
                onClick={handleGetLocation} 
                disabled={locating}
                className="flex items-center justify-center px-4 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all disabled:opacity-50"
                title="Get Exact GPS Coordinates"
              >
                {locating ? <Loader className="w-5 h-5 animate-spin" /> : <Locate className="w-5 h-5" />}
              </button>
            </div>
            {(form.latitude && form.longitude) && (
              <p className="text-xs text-green-400 mt-2 font-medium flex items-center gap-1">
                <Locate className="w-3 h-3" /> Exact GPS saved ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})
              </p>
            )}
          </Field>
        </div>

        <Field id="description" label="Complaint Description" icon={FileText}>
          <textarea id="description" rows={6} className="input-field resize-y"
            placeholder="Describe the incident in detail... (or use voice input above)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
        </Field>

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" className="btn-primary px-8" disabled={loading}>
            {loading ? (
              <><svg className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" viewBox="0 0 24 24" />Registering...</>
            ) : (
              <><FileText className="w-4 h-4" />Register Complaint</>
            )}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
