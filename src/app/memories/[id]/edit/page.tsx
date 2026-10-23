'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Trash2,
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

export default function EditMemoryPage() {
  const router = useRouter();
  const params = useParams();
  const memoryId = params?.id as string;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [mood, setMood] = useState<MoodType | ''>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingAssets, setExistingAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!memoryId) return;
    loadData();
  }, [memoryId]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [catRes, memRes, assetRes] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
        supabase.from('memories').select('*').eq('id', memoryId).eq('user_id', user.id).single(),
        supabase.from('media_assets').select('*').eq('memory_id', memoryId),
      ]);

      if (catRes.data) setCategories(catRes.data);

      if (memRes.data) {
        const mem = memRes.data;
        setTitle(mem.title || '');
        setBody(mem.body || '');
        setEventDate(mem.event_date);
        setEventTime(mem.event_time ? mem.event_time.slice(0, 5) : '');
        setLocationName(mem.location_name || '');
        setCategoryId(mem.category_id || '');
        setMood(mem.mood || '');
        setIsFavorite(mem.is_favorite);
      }

      if (assetRes.data) {
        setExistingAssets(assetRes.data);
      }
    } catch (err) {
      console.error('Error loading memory for edit:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Foydalanuvchi tizimga kirmagan');

      const { error } = await supabase
        .from('memories')
        .update({
          title: title.trim() || null,
          body: body.trim() || null,
          event_date: eventDate,
          event_time: eventTime ? `${eventTime}:00` : null,
          location_name: locationName.trim() || null,
          category_id: categoryId || null,
          mood: mood || null,
          is_favorite: isFavorite,
        })
        .eq('id', memoryId)
        .eq('user_id', user.id);

      if (error) throw error;

      router.push(`/memories/${memoryId}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xotirani yangilashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAsset(assetId: string) {
    try {
      await supabase.from('media_assets').delete().eq('id', assetId);
      setExistingAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      console.error('Delete asset error:', err);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/memories/${memoryId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xotiraga qaytish</span>
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-6">Xotirani tahrirlash</h1>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Xotira sarlavhasi
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#121217] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

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
                  <span>Vaqt</span>
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
                  <span>Joy nomi</span>
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Xotira matni
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-[#121217] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-violet-500 leading-relaxed"
              />
            </div>

            {/* Category */}
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

            {/* Existing media assets */}
            {existingAssets.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Mavjud fayllar ({existingAssets.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {existingAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300"
                    >
                      <span className="truncate max-w-[150px]">{asset.file_name}</span>
                      <button
                        type="button"
                        onClick={() => deleteAsset(asset.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new media */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Yana fayllar qo‘shish
              </label>
              <MediaUploader
                memoryId={memoryId}
                onUploaded={(newAsset) => setExistingAssets((prev) => [...prev, newAsset])}
              />
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-zinc-800 border-white/20"
                />
                <span>Sevimlilar</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>O‘zgarishlarni saqlash</span>
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
