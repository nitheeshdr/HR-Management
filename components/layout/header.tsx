'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useMobileNav } from './app-shell';
import { Calendar, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Header({ title, description, children }: HeaderProps) {
  const { user } = useAuth();
  const { toggle } = useMobileNav();
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const d = new Date();
    setCurrentDate(
      d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    );
  }, []);

  return (
    <header className="min-h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label="Open navigation menu"
          className="md:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h2>
          {description && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block truncate">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {/* Date pill (hidden on small screens) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
          <Calendar className="size-3.5 text-blue-600" />
          <span>{currentDate || 'Today'}</span>
        </div>

        {/* Custom Actions (e.g. Save & Lock, Export) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {children}
        </div>
      </div>
    </header>
  );
}
