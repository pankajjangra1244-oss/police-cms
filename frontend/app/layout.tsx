import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Police CMS — Smart Case Management',
  description: 'AI-powered police case management system for efficient complaint handling, investigations, and analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-navy-900 antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a2340',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#0f172a' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0f172a' },
            },
          }}
        />
      </body>
    </html>
  );
}
