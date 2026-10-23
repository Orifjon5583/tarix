'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Plus,
  Search,
  Filter,
  Heart,
  Archive,
  Calendar,
  Tag as TagIcon,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  MapPin,
  Smile,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Memory, Category, Tag } from '@/lib/supabase/types';
import { formatUzbekDate } from '@/lib/utils/dates';
import clsx from 'clsx';

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadCategories();
    loadMemories();
  }, [selectedCategory, onlyFavorites, sortOrder]);

  async function loadCategories() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name');
    if (data) setCategories(data);
  }

  async function loadMemories() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('memories')
        .select('*, category:categories(*), media:media_assets(*)')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('event_date', { ascending: sortOrder === 'asc' });

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      if (onlyFavorites) {
        query = query.eq('is_favorite', true);
      }

      const { data, error } = await query;
      if (!error && data) {
        setMemories(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(memoryId: string, currentStatus: boolean, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await supabase.from('memories').update({ is_favorite: !currentStatus }).eq('id', memoryId);
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, is_favorite: !currentStatus } : m))
      );
    } catch (err) {
      console.error('Toggle favorite error:', err);
    }
  }

  const filteredMemories = memories.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.body && m.body.toLowerCase().includes(q)) ||
      (m.location_name && m.location_name.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-violet-400" />
              <span>Xotiralar</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Hayotingizning har bir esda qolarli lahzalari
            </p>
          </div>

          <Link
            href="/memories/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Xotira qo‘shish</span>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Xotira nomi, matni yoki joyi bo‘yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121217] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
          >
            <option value="all">Barcha kategoriyalar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Favorite Toggle */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={clsx(
              'px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all',
              onlyFavorites
                ? 'bg-pink-600/20 border-pink-500/40 text-pink-300'
                : 'bg-[#121217] border-white/10 text-zinc-400 hover:text-white'
            )}
          >
            <Heart className={clsx('w-4 h-4', onlyFavorites && 'fill-pink-400 text-pink-400')} />
            <span>Sevimlilar</span>
          </button>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-3.5 py-2.5 rounded-xl bg-[#121217] border border-white/10 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
            title="Sana bo‘yicha tartib"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Yangi' : 'Eski'}</span>
          </button>
        </div>

        {/* Memories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-zinc-900/40 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/10">
            <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Xotiralar topilmadi</h3>
            <p className="text-xs text-zinc-400 mb-6 max-w-sm mx-auto">
              Ushbu filtr bo‘yicha xotira mavjud emas yoki hali hech narsa kiritilmagan.
            </p>
            <Link
              href="/memories/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi xotira yaratish</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMemories.map((mem) => (
              <Link
                key={mem.id}
                href={`/memories/${mem.id}`}
                className="glass-panel p-5 rounded-2xl flex flex-col justify-between group hover:border-violet-500/40 hover:-translate-y-1 transition-all border border-white/5 relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-violet-300 bg-violet-950/40 px-2.5 py-0.5 rounded-full border border-violet-500/20">
                      {formatUzbekDate(mem.event_date)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(mem.id, mem.is_favorite, e)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-pink-400 transition-colors"
                      title="Sevimlilar"
                    >
                      <Heart
                        className={clsx('w-4 h-4', mem.is_favorite && 'fill-pink-500 text-pink-500')}
                      />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1 mb-2">
                    {mem.title || 'Sarlavhasiz xotira'}
                  </h3>

                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                    {mem.body || 'Hech qanday matn kiritilmagan'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-2 truncate">
                    {mem.location_name && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        <span className="truncate max-w-[120px]">{mem.location_name}</span>
                      </span>
                    )}
                  </div>
                  {mem.media && mem.media.length > 0 && (
                    <span className="text-[11px] font-medium text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-md">
                      📷 {mem.media.length} fayl
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
