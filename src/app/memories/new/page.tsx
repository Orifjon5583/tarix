'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Smile,
  Heart,
  Save,
  Loader2,
  FolderPlus,
  Tag as TagIcon,
  Sparkles,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import MediaUploader from '@/components/media/MediaUploader';
import { createClient } from '@/lib/supabase/client';
import { Category, MediaAsset, MoodType } from '@/lib/supabase/types';
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

export default function NewMemoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [mood, setMood] = useState<MoodType | ''>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [uploadedAssets, setUploadedAssets] = useState<MediaAsset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadCategories() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name');
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // Rule: Title, body or media must have at least one!
    if (!title.trim() && !body.trim() && uploadedAssets.length === 0) {
      setErrorMsg('Xotirani saqlash uchun sarlavha, matn yoki kamida bitta rasm/video yuklang!');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Foydalanuvchi tizimga kirmagan');

      // 1. Insert Memory
      const { data: newMem, error: memErr } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: title.trim() || null,
          body: body.trim() || null,
          event_date: eventDate,
          event_time: eventTime ? `${eventTime}:00` : null,
          location_name: locationName.trim() || null,
          category_id: categoryId || null,
          mood: mood || null,
          is_favorite: isFavorite,
        })
        .select()
        .single();

      if (memErr) throw memErr;

      // 2. Link uploaded media assets to this memory
      if (uploadedAssets.length > 0) {
        const assetIds = uploadedAssets.map((a) => a.id);
        await supabase
          .from('media_assets')
          .update({ memory_id: newMem.id })
          .in('id', assetIds);
      }

      // 3. Handle Tags
      if (tagsInput.trim()) {
        const tagNames = tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);

        for (const tagName of tagNames) {
          // Upsert tag
          let tagId: string | null = null;
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', tagName)
            .maybeSingle();

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            const { data: createdTag } = await supabase
              .from('tags')
              .insert({ user_id: user.id, name: tagName })
              .select('id')
              .single();
            if (createdTag) tagId = createdTag.id;
          }

          if (tagId) {
            await supabase
              .from('memory_tags')
              .insert({ memory_id: newMem.id, tag_id: tagId })
              .maybeSingle();
          }
        }
      }

      router.push(`/memories/${newMem.id}`);
      router.refresh();
    } catch (err: any) {
      console.error('Save memory error:', err);
      setErrorMsg(err.message || 'Xotirani saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/memories"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xotiralar ro‘yxatiga qaytish</span>
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 pb-6 border-b border-white/5 mb-6">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-glow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Yangi xotira yaratish</h1>
              <p className="text-xs text-zinc-400">Hayotingizdagi yangi sahifani muhrlang</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Xotira sarlavhasi
              </label>
              <input
                type="text"
                placeholder="Masalan: Samarqanddagi unutilmas kecha"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#121217] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-all font-medium"
              />
            </div>

            {/* Date, Time, Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" />
                  <span>Voqea sanasi *</span>
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>Vaqt (ixtiyoriy)</span>
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" />
                  <span>Joy nomi (ixtiyoriy)</span>
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Registon maydoni"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Xotira haqida batafsil matn
              </label>
              <textarea
                rows={5}
                placeholder="Ushbu kunda nimalar yuz berdi? Nimalarni eslab qolishni istaysiz..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-[#121217] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed custom-scrollbar"
              />
            </div>

            {/* Media Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Rasmlar va videolar biriktirish
              </label>
              <MediaUploader
                onUploaded={(asset) => {
                  setUploadedAssets((prev) => [...prev, asset]);
                }}
              />
            </div>

            {/* Category & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-violet-400" />
                  <span>Kategoriya</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">Kategoriyasiz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-violet-400" />
                  <span>Teglar (vergul bilan ajrating)</span>
                </label>
                <input
                  type="text"
                  placeholder="sayohat, oila, 2024"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Mood selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-violet-400" />
                <span>Kayfiyat</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(mood === m.value ? '' : m.value)}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all',
                      mood === m.value
                        ? 'bg-violet-600/30 border-violet-500 text-violet-200 shadow-glow-sm'
                        : 'bg-[#121217] border-white/10 text-zinc-400 hover:text-white'
                    )}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite checkbox & Submit */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-zinc-800 border-white/20"
                />
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-pink-400" />
                  Sevimlilar ro‘yxatiga qo‘shish
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Xotirani saqlash</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
