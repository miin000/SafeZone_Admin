'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/login') {
      setIsAuthenticated(true);
      return;
    }

    // Check if user is logged in (only runs on client)
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      setIsAuthenticated(false);
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // Check if user has proper role
      if (!['admin', 'health_authority'].includes(user.role)) {
        localStorage.clear();
        setIsAuthenticated(false);
        router.push('/login');
        return;
      }
      
      setIsAuthenticated(true);
    } catch (err) {
      localStorage.clear();
      setIsAuthenticated(false);
      router.push('/login');
    }
  }, [pathname, router]);

  // Don't render children on login page (let login page handle itself)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Show nothing while checking authentication (prevents flash of content)
  if (isAuthenticated === null) {
    return null;
  }

  // Don't render if not authenticated (while redirecting)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
