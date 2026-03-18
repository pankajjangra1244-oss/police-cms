'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
