'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  Clock,
  BookOpen,
  CalendarHeart,
  Image as ImageIcon,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Memory, DiaryEntry, ImportantDate, MediaAsset } from '@/lib/supabase/types';
import { formatUzbekDate } from '@/lib/utils/dates';
import clsx from 'clsx';

export default function FavoritesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'memories' | 'diary' | 'dates'>('all');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [memRes, diaryRes, dateRes] = await Promise.all([
        supabase.from('memories').select('*, category:categories(*)').eq('user_id', user.id).eq('is_favorite', true),
        supabase.from('diary_entries').select('*').eq('user_id', user.id).eq('is_favorite', true),
        supabase.from('important_dates').select('*').eq('user_id', user.id).eq('is_favorite', true),
      ]);

      if (memRes.data) setMemories(memRes.data);
      if (diaryRes.data) setDiaryEntries(diaryRes.data);
      if (dateRes.data) setDates(dateRes.data);
    } finally {
      setLoading(false);
    }
  }

  const totalFavoritesCount = memories.length + diaryEntries.length + dates.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            <span>Sevimlilar To‘plami</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Yulduzcha bilan belgilangan eng aziz xotiralar va yozuvlar
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'all'
                ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Barchasi ({totalFavoritesCount})
          </button>
          <button
            onClick={() => setActiveTab('memories')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'memories'
                ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Xotiralar ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'diary'
                ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Kundalik ({diaryEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('dates')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'dates'
                ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Sanalar ({dates.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : totalFavoritesCount === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/10">
            <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Hozircha sevimlilar yo‘q</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Xotiralar, kundalik yoki muhim sanalardagi yurak belgisini bosib sevimli qilishingiz mumkin.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Memories */}
            {(activeTab === 'all' || activeTab === 'memories') && memories.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>Xotiralar ({memories.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memories.map((m) => (
                    <Link
                      key={m.id}
                      href={`/memories/${m.id}`}
                      className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-pink-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <span className="text-[10px] text-zinc-400 block mb-1">
                          {formatUzbekDate(m.event_date)}
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1">
                          {m.title || 'Sarlavhasiz xotira'}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{m.body}</p>
                      </div>
                      <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-xs text-pink-400 font-semibold">
                        <span>Ko‘rish</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Diary */}
            {(activeTab === 'all' || activeTab === 'diary') && diaryEntries.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Kundalik Yozuvlari ({diaryEntries.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {diaryEntries.map((d) => (
                    <Link
                      key={d.id}
                      href={`/diary`}
                      className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-blue-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <span className="text-[10px] text-zinc-400 block mb-1">
                          {formatUzbekDate(d.entry_date)}
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                          {d.title || 'Sarlavhasiz yozuv'}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{d.body}</p>
                      </div>
                      <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-xs text-blue-400 font-semibold">
                        <span>Kundalikda ochish</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Important Dates */}
            {(activeTab === 'all' || activeTab === 'dates') && dates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <CalendarHeart className="w-3.5 h-3.5 text-pink-400" />
                  <span>Muhim Sanalar ({dates.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dates.map((d) => (
                    <Link
                      key={d.id}
                      href={`/important-dates`}
                      className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-pink-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <span className="text-[10px] text-zinc-400 block mb-1">
                          {formatUzbekDate(d.event_date)}
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                          {d.title}
                        </h4>
                        {d.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{d.description}</p>
                        )}
                      </div>
                      <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-xs text-pink-400 font-semibold">
                        <span>Batafsil</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
