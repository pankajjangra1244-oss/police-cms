'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <svg className="spinner w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full" viewBox="0 0 24 24" />
        <span>Loading...</span>
      </div>
    </div>
  );
}
