'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import {
  Shield, LayoutDashboard, FileText, PlusCircle,
  Upload, BarChart3, User, LogOut, Menu, X, ChevronRight,
  AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/complaints', icon: FileText, label: 'Complaints' },
  { href: '/complaints/new', icon: PlusCircle, label: 'New Complaint' },
  { href: '/evidence', icon: Upload, label: 'Evidence' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userStr = Cookies.get('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 p-6 border-b border-white/5', collapsed && 'px-4 justify-center')}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-white font-bold text-sm leading-none">Police CMS</p>
            <p className="text-slate-500 text-xs mt-0.5">Management System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                active
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={clsx('w-4 h-4 flex-shrink-0', active && 'text-blue-400')} />
              {!collapsed && (
                <span className="animate-fade-in flex-1">{label}</span>
              )}
              {!collapsed && active && (
                <ChevronRight className="w-3 h-3 text-blue-400 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Card */}
      <div className={clsx('p-3 border-t border-white/5', collapsed && 'px-2')}>
        {user && !collapsed && (
          <div className="bg-navy-800/60 rounded-xl p-3 mb-2 border border-white/5">
            <p className="text-white text-sm font-semibold truncate">{user.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx('badge text-[10px]', user.role === 'admin' ? 'badge-critical' : 'badge-active')}>
                {user.role === 'admin' ? '★ Admin' : '● Officer'}
              </span>
              <span className="text-slate-500 text-xs truncate">{user.badge_number}</span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200',
            collapsed && 'justify-center'
          )}
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-navy-700 border border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={clsx(
        'lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-navy-800 border-r border-white/5 transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-navy-800 border-r border-white/5 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}>
        <SidebarContent />
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-navy-700 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className={clsx('w-3 h-3 transition-transform duration-300', collapsed ? '' : 'rotate-180')} />
        </button>
      </aside>

      {/* Spacer for desktop layout */}
      <div className={clsx('hidden lg:block flex-shrink-0 transition-all duration-300', collapsed ? 'w-16' : 'w-64')} />
    </>
  );
}
