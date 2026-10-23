'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Image as ImageIcon,
  Video,
  BookOpen,
  CalendarHeart,
  Send,
  Sparkles,
  Plus,
  ArrowRight,
  Flame,
  Calendar,
  Lock,
  ChevronRight,
  Heart,
  Tag as TagIcon,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Memory, ImportantDate, FutureLetter, Reminder } from '@/lib/supabase/types';
import { formatUzbekDate, calculateNextOccurrence, formatTimeRemaining } from '@/lib/utils/dates';

interface DashboardStats {
  totalMemories: number;
  totalPhotos: number;
  totalVideos: number;
  totalDiary: number;
  totalLetters: number;
  upcomingDatesCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMemories: 0,
    totalPhotos: 0,
    totalVideos: 0,
    totalDiary: 0,
    totalLetters: 0,
    upcomingDatesCount: 0,
  });
  const [todayMemories, setTodayMemories] = useState<Memory[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [upcomingDates, setUpcomingDates] = useState<ImportantDate[]>([]);
  const [upcomingLetters, setUpcomingLetters] = useState<FutureLetter[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate(); // 1-31

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch counts
        const [
          { count: memoriesCount },
          { count: photosCount },
          { count: videosCount },
          { count: diaryCount },
          { count: lettersCount },
        ] = await Promise.all([
          supabase.from('memories').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_archived', false),
          supabase.from('media_assets').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('media_type', 'image'),
          supabase.from('media_assets').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('media_type', 'video'),
          supabase.from('diary_entries').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_archived', false),
          supabase.from('future_letters').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'locked'),
        ]);

        // 2. Fetch Recent Memories
        const { data: recentMem } = await supabase
          .from('memories')
          .select('*, media:media_assets(*), category:categories(*)')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('event_date', { ascending: false })
          .limit(4);

        if (recentMem) setRecentMemories(recentMem);

        // 3. Fetch "On This Day" (Bugungi xotiralar)
        // Memories where month and day match today, but year < currentYear
        const { data: allUserMemories } = await supabase
          .from('memories')
          .select('*, media:media_assets(*), category:categories(*)')
          .eq('user_id', user.id)
          .eq('is_archived', false);

        if (allUserMemories) {
          const onThisDay = allUserMemories.filter((m) => {
            const parts = m.event_date.split('-');
            if (parts.length === 3) {
              const mYear = parseInt(parts[0], 10);
              const mMonth = parseInt(parts[1], 10);
              const mDay = parseInt(parts[2], 10);
              return mMonth === currentMonth && mDay === currentDay && mYear < now.getFullYear();
            }
            return false;
          });
          setTodayMemories(onThisDay);
        }

        // 4. Fetch Upcoming Important Dates
        const { data: dates } = await supabase
          .from('important_dates')
          .select('*')
          .eq('user_id', user.id);

        if (dates) {
          const computedDates = dates
            .map((d) => {
              const calc = calculateNextOccurrence(d.event_date, d.repeat_yearly);
              return {
                ...d,
                days_until: calc.daysUntil,
                is_today: calc.isToday,
                years_count: calc.yearsPassed,
              };
            })
            .sort((a, b) => (a.days_until ?? 999) - (b.days_until ?? 999));

          setUpcomingDates(computedDates.slice(0, 5));
          setStats((prev) => ({ ...prev, upcomingDatesCount: computedDates.length }));
        }

        // 5. Fetch Future Letters nearing unlock
        const { data: letters } = await supabase
          .from('future_letters')
          .select('id, user_id, title, unlock_at, timezone, status, created_at, updated_at, reminder_enabled, opened_at')
          .eq('user_id', user.id)
          .eq('status', 'locked')
          .order('unlock_at', { ascending: true })
          .limit(3);

        if (letters) {
          setUpcomingLetters(letters as FutureLetter[]);
        }

        // 6. Fetch Today's Reminders
        const todayIso = new Date().toISOString().split('T')[0];
        const { data: reminders } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(5);

        if (reminders) {
          setTodayReminders(reminders);
        }

        setStats({
          totalMemories: memoriesCount || 0,
          totalPhotos: photosCount || 0,
          totalVideos: videosCount || 0,
          totalDiary: diaryCount || 0,
          totalLetters: lettersCount || 0,
          upcomingDatesCount: dates?.length || 0,
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const statCards = [
    { label: 'Jami xotiralar', value: stats.totalMemories, icon: Clock, color: 'text-violet-400', bg: 'bg-violet-600/10' },
    { label: 'Rasmlar', value: stats.totalPhotos, icon: ImageIcon, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
    { label: 'Videolar', value: stats.totalVideos, icon: Video, color: 'text-amber-400', bg: 'bg-amber-600/10' },
    { label: 'Kundalik yozuvlari', value: stats.totalDiary, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { label: 'Kelajak xatlari', value: stats.totalLetters, icon: Send, color: 'text-pink-400', bg: 'bg-pink-600/10' },
    { label: 'Muhim sanalar', value: stats.upcomingDatesCount, icon: CalendarHeart, color: 'text-rose-400', bg: 'bg-rose-600/10' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {statCards.map((st, i) => {
            const Icon = st.icon;
            return (
              <div
                key={i}
                className="glass-panel p-4 rounded-2xl flex flex-col justify-between border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-400 font-medium">{st.label}</span>
                  <div className={`p-2 rounded-xl ${st.bg} ${st.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-white">
                  {loading ? '...' : st.value}
                </div>
              </div>
            );
          })}
        </section>

        {/* "On This Day" (Bugungi xotiralar) Banner */}
        {todayMemories.length > 0 && (
          <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-violet-950/60 via-purple-950/40 to-[#121217] border border-violet-500/30 shadow-glow">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="p-2 rounded-xl bg-violet-600 text-white shadow-glow-sm">
                  <Flame className="w-5 h-5 animate-pulse" />
                </span>
                <span className="text-xs uppercase tracking-wider font-bold text-violet-300">
                  O‘tmishga qaytish
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Bugungi kunda o‘tgan yillarda...
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mb-6">
                Aynan shu kunda ilgari siz bilan sodir bo‘lgan esda qolarli voqealar.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayMemories.map((mem) => {
                  const yearsAgo = now.getFullYear() - parseInt(mem.event_date.split('-')[0], 10);
                  return (
                    <Link
                      key={mem.id}
                      href={`/memories/${mem.id}`}
                      className="glass-panel p-4 rounded-2xl flex items-center justify-between group hover:border-violet-500/40 transition-all"
                    >
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-violet-600/30 text-violet-300 text-xs font-semibold mb-2">
                          {yearsAgo} yil oldin
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                          {mem.title || 'Sarlavhasiz xotira'}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{mem.body}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-violet-400 transition-transform group-hover:translate-x-1" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Main Grid: Recent Memories & Sidebar Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Memories (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Oxirgi xotiralar</h3>
                <p className="text-xs text-zinc-400">Yaqinda kiritilgan xotiralar</p>
              </div>
              <Link
                href="/memories"
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                <span>Barchasini ko‘rish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-44 rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : recentMemories.length === 0 ? (
              <div className="glass-panel rounded-3xl p-8 text-center border border-dashed border-white/10">
                <Clock className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1">Xotiralar mavjud emas</h4>
                <p className="text-xs text-zinc-400 mb-4 max-w-sm mx-auto">
                  Hayotingizdagi muhim voqealarni saqlashni hoziroq boshlang.
                </p>
                <Link
                  href="/memories/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Birinchi xotirani qo‘shish</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentMemories.map((mem) => (
                  <Link
                    key={mem.id}
                    href={`/memories/${mem.id}`}
                    className="glass-panel p-5 rounded-2xl flex flex-col justify-between group hover:border-violet-500/40 transition-all border border-white/5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-medium text-zinc-400">
                          {formatUzbekDate(mem.event_date)}
                        </span>
                        {mem.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 font-medium">
                            {mem.category.name}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1 mb-1">
                        {mem.title || 'Sarlavhasiz xotira'}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {mem.body || 'Hech qanday matn yo‘q'}
                      </p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        {mem.media && mem.media.length > 0 && (
                          <span className="text-zinc-300 font-medium">
                            📷 {mem.media.length} fayl
                          </span>
                        )}
                      </span>
                      <span className="text-violet-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Ko‘rish <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Upcoming Dates & Future Letters */}
          <div className="space-y-6">
            {/* Upcoming Important Dates */}
            <div className="glass-panel rounded-3xl p-5 border border-white/5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <CalendarHeart className="w-4 h-4 text-pink-400" />
                  <h4 className="text-sm font-bold text-white">Yaqinlashayotgan sanalar</h4>
                </div>
                <Link
                  href="/important-dates"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Hammasi
                </Link>
              </div>

              {upcomingDates.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">
                  Muhim sanalar kiritilmagan
                </p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingDates.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-zinc-400 text-[11px] mt-0.5">
                          {formatUzbekDate(item.event_date)}
                          {item.years_count ? ` (${item.years_count}-yil)` : ''}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-pink-500/10 text-pink-300 font-semibold text-[11px] shrink-0">
                        {item.days_until === 0
                          ? 'Bugun!'
                          : `${item.days_until} kun qoldi`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Locked Future Letters */}
            <div className="glass-panel rounded-3xl p-5 border border-white/5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-violet-400" />
                  <h4 className="text-sm font-bold text-white">Kelajak xatlari</h4>
                </div>
                <Link
                  href="/letters"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Hammasi
                </Link>
              </div>

              {upcomingLetters.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-500 mb-2">Hali kelajak xatlari yo‘q</p>
                  <Link
                    href="/letters"
                    className="text-xs font-semibold text-violet-400 hover:underline"
                  >
                    + Kelajakdagi o‘zingizga xat yozing
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingLetters.map((letter) => {
                    const remaining = formatTimeRemaining(letter.unlock_at);
                    return (
                      <div
                        key={letter.id}
                        className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 text-white font-semibold truncate">
                            <Lock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                            <span className="truncate">{letter.title}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Ochilish: {formatUzbekDate(letter.unlock_at)}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-violet-600/30 text-violet-200 font-semibold text-[10px] shrink-0">
                          {remaining.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
