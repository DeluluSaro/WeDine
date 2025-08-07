'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for admin session
    const adminSession = localStorage.getItem('adminSession');
    
    if (!adminSession) {
      router.push('/admin-login');
      return;
    }

    try {
      const session = JSON.parse(adminSession);
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      
      // Check if session is less than 24 hours old
      const sessionAge = now.getTime() - loginTime.getTime();
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (sessionAge > maxSessionAge) {
        // Session expired
        localStorage.removeItem('adminSession');
        router.push('/admin-login');
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Session validation error:', error);
      localStorage.removeItem('adminSession');
      router.push('/admin-login');
      return;
    }
    
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="admin-layout">
      {children}
    </div>
  );
} 