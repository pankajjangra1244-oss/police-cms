'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';
import { User, BadgeCheck, Shield, Mail, Phone, Building, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const userCookie = Cookies.get('user');
  const localUser = userCookie ? JSON.parse(userCookie) : null;

  useEffect(() => {
    authAPI.me().then(res => setProfile(res.data)).catch(() => setProfile(localUser)).finally(() => setLoading(false));
  }, []);

  const user = profile || localUser;

  if (loading) return (
    <div className="animate-pulse space-y-4 max-w-2xl">
      <div className="h-8 w-48 bg-navy-700 rounded-lg" />
      <div className="h-64 bg-navy-700 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="page-title">Officer Profile</h1>
        <p className="page-subtitle">Your account information and credentials</p>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-6 mb-8">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-glow">
            <span className="text-3xl font-bold text-white">
              {user?.name?.charAt(0) || 'O'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name || 'Officer'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx('badge', user?.role === 'admin' ? 'badge-critical' : 'badge-active')}>
                {user?.role === 'admin' ? '★ Administrator' : '● Field Officer'}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">{user?.department || 'Police Department'}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            { icon: BadgeCheck, label: 'Badge Number', value: user?.badge_number },
            { icon: Shield, label: 'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
            { icon: Mail, label: 'Email', value: user?.email },
            { icon: Phone, label: 'Phone', value: user?.phone || 'Not provided' },
            { icon: Building, label: 'Department', value: user?.department || 'Not specified' },
            { icon: Calendar, label: 'Member Since', value: user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-navy-800/60 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
              </div>
              <p className="text-white text-sm font-medium">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" /> System Information
        </h3>
        <div className="space-y-3 text-sm">
          {[
            { label: 'System', value: 'Police Case Management System v1.0' },
            { label: 'Access Level', value: user?.role === 'admin' ? 'Full Access — All departments' : 'Officer — Own cases only' },
            { label: 'Session', value: 'Active (24 hour JWT token)' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-300 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
