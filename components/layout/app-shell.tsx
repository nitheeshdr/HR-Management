'use client';

import { useState, createContext, useContext } from 'react';
import { Sidebar } from './sidebar';

interface MobileNavContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
}

const MobileNavContext = createContext<MobileNavContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
  close: () => {},
});

export const useMobileNav = () => useContext(MobileNavContext);

export function AppShell({
  role,
  children,
}: {
  role: 'ADMIN' | 'SUPERVISOR';
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  return (
    <MobileNavContext.Provider value={{ isOpen, setIsOpen, toggle, close }}>
      <div className="flex min-h-screen bg-slate-50 font-sans overflow-x-hidden">
        {/* Mobile Backdrop */}
        {isOpen && (
          <div
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Sidebar: Desktop static, Mobile sliding drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-50 md:static md:z-auto transition-transform duration-300 ease-in-out md:translate-x-0 ${
            isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <Sidebar role={role} onCloseMobile={close} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </MobileNavContext.Provider>
  );
}
