'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  User,
  LogOut,
  Settings,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import SearchModal from '../common/SearchModal';
import { createClient } from '@/lib/supabase/client';
import { formatUzbekDate, getUzbekWeekday } from '@/lib/utils/dates';

export default function Navbar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Mehmon');
  const [userEmail, setUserEmail] = useState<string>('');
  const supabase = createClient();

  const today = new Date();
  const formattedDate = formatUzbekDate(today);
  const weekday = getUzbekWeekday(today);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) {
          setUserName(profile.display_name);
        } else if (user.email) {
          setUserName(user.email.split('@')[0]);
        }
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="h-20 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        {/* Left: Greeting & Date */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
              {weekday}
            </span>
            <span className="text-xs text-zinc-400 font-medium">{formattedDate}</span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white mt-1">
            Xush kelibsiz, <span className="text-violet-300">{userName}</span>
          </h2>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Add Memory */}
          <Link
            href="/memories/new"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-glow-sm hover:shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Xotira qo‘shish</span>
          </Link>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/5 flex items-center gap-2"
            aria-label="Qidirish"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline text-xs text-zinc-400">Qidirish (Ctrl+K)</span>
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#121217] border border-white/10 shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-white/5 mb-1">
                    <p className="text-xs font-semibold text-white truncate">{userName}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{userEmail}</p>
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Sozlamalar & Eksport</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Tizimdan chiqish</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
