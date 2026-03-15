'use client';

import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

interface AdminPageLayoutProps {
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function AdminPageLayout({ navItems, children }: AdminPageLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar navItems={navItems} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
