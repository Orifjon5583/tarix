'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Heart,
  Calendar,
  Smile,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit,
  Clock,
  Sparkles,
  Archive,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { DiaryEntry, MoodType } from '@/lib/supabase/types';
import { formatUzbekDate } from '@/lib/utils/dates';
import clsx from 'clsx';

const MOODS: { value: MoodType; label: string; icon: string }[] = [
  { value: 'happy', label: 'Quvonchli', icon: '😊' },
  { value: 'blessed', label: 'Shukrona', icon: '✨' },
  { value: 'loved', label: 'Mehrli', icon: '💖' },
  { value: 'excited', label: 'Hayajonli', icon: '🤩' },
  { value: 'thoughtful', label: 'Mulohazali', icon: '🤔' },
  { value: 'nostalgic', label: 'Nostalgik', icon: '⏳' },
  { value: 'peaceful', label: 'Sokin', icon: '🍃' },
  { value: 'sad', label: 'G‘amgin', icon: '😔' },
];

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Editor states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mood, setMood] = useState<MoodType | ''>('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadDiaryEntries();
  }, [onlyFavorites]);

  async function loadDiaryEntries() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('entry_date', { ascending: false });

      if (onlyFavorites) {
        query = query.eq('is_favorite', true);
      }

      const { data, error } = await query;
      if (!error && data) {
        setEntries(data);
        if (data.length > 0 && !selectedEntry && !isCreatingNew) {
          selectEntryForEditing(data[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function selectEntryForEditing(entry: DiaryEntry) {
    setSelectedEntry(entry);
    setIsCreatingNew(false);
    setTitle(entry.title || '');
    setBody(entry.body || '');
    setEntryDate(entry.entry_date);
    setMood(entry.mood || '');
    setIsFavorite(entry.is_favorite);
    setSaveStatus('idle');
  }

  function startNewEntry() {
    setSelectedEntry(null);
    setIsCreatingNew(true);
    setTitle('');
    setBody('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setMood('');
    setIsFavorite(false);
    setSaveStatus('idle');
  }

  // Auto-save trigger with 1.5s debounce
  useEffect(() => {
    if (!selectedEntry || !body.trim()) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, body, entryDate, mood, isFavorite]);

  async function performAutoSave() {
    if (!selectedEntry) return;
    setSaveStatus('saving');

    try {
      const { error } = await supabase
        .from('diary_entries')
        .update({
          title: title.trim() || null,
          body: body,
          entry_date: entryDate,
          mood: mood || null,
          is_favorite: isFavorite,
        })
        .eq('id', selectedEntry.id);

      if (error) throw error;

      setSaveStatus('saved');
      setEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id
            ? { ...e, title: title.trim() || null, body, entry_date: entryDate, mood: mood || null, is_favorite: isFavorite }
            : e
        )
      );

      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Auto save error:', err);
      setSaveStatus('error');
    }
  }

  async function handleManualSave() {
    if (!body.trim()) {
      alert('Iltimos, kundalik matnini kiriting!');
      return;
    }

    setSaveStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Foydalanuvchi tizimga kirmagan');

      if (isCreatingNew || !selectedEntry) {
        // Create new
        const { data: newEntry, error } = await supabase
          .from('diary_entries')
          .insert({
            user_id: user.id,
            title: title.trim() || null,
            body: body.trim(),
            entry_date: entryDate,
            mood: mood || null,
            is_favorite: isFavorite,
          })
          .select()
          .single();

        if (error) throw error;

        setEntries((prev) => [newEntry, ...prev]);
        setSelectedEntry(newEntry);
        setIsCreatingNew(false);
      } else {
        // Update existing
        await performAutoSave();
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!confirm('Ushbu kundalik yozuvini o‘chirishni xohlaysizmi?')) return;
    try {
      await supabase.from('diary_entries').delete().eq('id', entryId);
      const remaining = entries.filter((e) => e.id !== entryId);
      setEntries(remaining);
      if (selectedEntry?.id === entryId) {
        if (remaining.length > 0) {
          selectEntryForEditing(remaining[0]);
        } else {
          startNewEntry();
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.body && e.body.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-violet-400" />
              <span>Matnli Kundalik</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Fikrlaringiz, his-tuyg‘ularingiz va kechinmalaringiz arxivi
            </p>
          </div>

          <button
            onClick={startNewEntry}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi yozuv yaratish</span>
          </button>
        </div>

        {/* 2 Column Layout: Left Entries Sidebar, Right Real-time Auto-save Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
          {/* Entries List (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Yozuvlarni qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={clsx(
                  'p-2 rounded-xl border transition-all',
                  onlyFavorites
                    ? 'bg-pink-600/20 border-pink-500/40 text-pink-400'
                    : 'bg-[#121217] border-white/10 text-zinc-400 hover:text-white'
                )}
                title="Sevimlilar"
              >
                <Heart className={clsx('w-4 h-4', onlyFavorites && 'fill-pink-400')} />
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs glass-panel rounded-2xl p-4">
                  Kundalik yozuvlari topilmadi
                </div>
              ) : (
                filteredEntries.map((item) => {
                  const isSelected = selectedEntry?.id === item.id && !isCreatingNew;
                  return (
                    <div
                      key={item.id}
                      onClick={() => selectEntryForEditing(item)}
                      className={clsx(
                        'p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group',
                        isSelected
                          ? 'bg-violet-950/20 border-violet-500/40 shadow-glow-sm'
                          : 'bg-[#121217] border-white/5 hover:border-white/15'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-semibold text-violet-300">
                            {formatUzbekDate(item.entry_date)}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.is_favorite && (
                              <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEntry(item.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                          {item.title || 'Sarlavhasiz yozuv'}
                        </h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Editor Area (8 Cols) */}
          <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              {/* Status Header: Auto-save badge */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    {isCreatingNew ? 'Yangi yozuv kiritish' : 'Tahrirlash rejimi'}
                  </span>
                  {saveStatus === 'saving' && (
                    <span className="text-[11px] text-violet-400 flex items-center gap-1 font-medium animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saqlanmoqda...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Saqlandi
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Xatolik yuz berdi
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={clsx(
                      'p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1',
                      isFavorite
                        ? 'bg-pink-600/20 border-pink-500/40 text-pink-400'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                    )}
                  >
                    <Heart className={clsx('w-3.5 h-3.5', isFavorite && 'fill-pink-400')} />
                    <span className="hidden sm:inline">Sevimlilar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-glow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Saqlash</span>
                  </button>
                </div>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Kundalik sarlavhasi..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Mood pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 mr-1">Kayfiyat:</span>
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(mood === m.value ? '' : m.value)}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all',
                      mood === m.value
                        ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-glow-sm'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5'
                    )}
                  >
                    <span>{m.icon}</span>
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Main Body Editor */}
              <div>
                <textarea
                  rows={14}
                  placeholder="Bugun nimalar sodir bo‘ldi? O‘ylaringiz va his-tuyg‘ularingizni yozing... (Avtomatik saqlanadi)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-transparent text-sm sm:text-base text-zinc-200 placeholder-zinc-600 focus:outline-none leading-relaxed resize-none custom-scrollbar"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{body.length} belgi, {body.trim() ? body.trim().split(/\s+/).length : 0} so‘z</span>
              <span>{formatUzbekDate(entryDate)}</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
