'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Clock,
  Image as ImageIcon,
  BookOpen,
  Menu,
  X,
  Calendar,
  CalendarHeart,
  Send,
  Bell,
  Archive,
  Settings,
  Heart,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { NAV_ITEMS } from './Sidebar';

export default function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mainBottomTabs = [
    { href: '/', label: 'Asosiy', icon: Home },
    { href: '/memories', label: 'Xotiralar', icon: Clock },
    { href: '/gallery', label: 'Galereya', icon: ImageIcon },
    { href: '/diary', label: 'Kundalik', icon: BookOpen },
  ];

  return (
    <>
      {/* Bottom Floating Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0f]/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 safe-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {mainBottomTabs.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all',
                  isActive
                    ? 'text-violet-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Icon className={clsx('w-5 h-5', isActive && 'text-violet-400')} />
                <span className="text-[11px]">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu Drawer Trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all"
            aria-label="Barcha bo'limlar"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px]">Barchasi</span>
          </button>
        </div>
      </div>

      {/* Slide-over Drawer for All Nav Items */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative bg-[#111116] border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 z-10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Xotiralarim</h3>
                  <p className="text-xs text-zinc-400">Barcha bo‘limlar</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-2xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                        : 'bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/60'
                    )}
                  >
                    <Icon className={clsx('w-5 h-5', isActive ? 'text-violet-400' : 'text-zinc-400')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
