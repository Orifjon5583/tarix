'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Clock,
  Image as ImageIcon,
  BookOpen,
  Calendar,
  CalendarHeart,
  Send,
  Bell,
  Archive,
  Settings,
  Sparkles,
  Heart,
} from 'lucide-react';
import clsx from 'clsx';

export const NAV_ITEMS = [
  { href: '/', label: 'Bosh sahifa', icon: Home },
  { href: '/memories', label: 'Xotiralar', icon: Clock },
  { href: '/gallery', label: 'Galereya', icon: ImageIcon },
  { href: '/diary', label: 'Kundalik', icon: BookOpen },
  { href: '/calendar', label: 'Kalendar', icon: Calendar },
  { href: '/important-dates', label: 'Muhim sanalar', icon: CalendarHeart },
  { href: '/letters', label: 'Kelajak xatlari', icon: Send },
  { href: '/reminders', label: 'Eslatmalar', icon: Bell },
  { href: '/favorites', label: 'Sevimlilar', icon: Heart },
  { href: '/archive', label: 'Arxiv', icon: Archive },
  { href: '/settings', label: 'Sozlamalar', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-[#0b0b0e]/95 backdrop-blur-xl h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-glow-sm">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            Xotiralarim
          </h1>
          <p className="text-xs text-zinc-400 font-medium">Shaxsiy Raqamli Arxiv</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
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
              className={clsx(
                'flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-violet-600/15 text-violet-300 font-semibold border border-violet-500/30 shadow-glow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-violet-400' : 'text-zinc-400 group-hover:text-zinc-200'
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Privacy Badge */}
      <div className="p-4 border-t border-white/5">
        <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-3 flex items-center gap-3 text-xs text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          <div className="flex-1">
            <p className="text-zinc-200 font-medium">Shaxsiy Rejim</p>
            <p className="text-[11px] text-zinc-400">Faqat sizga ochiq</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
