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
  Archive,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Share2,
  Folder,
  Tag as TagIcon,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import MediaViewer from '@/components/media/MediaViewer';
import { createClient } from '@/lib/supabase/client';
import { Memory, MediaAsset } from '@/lib/supabase/types';
import { formatUzbekDate } from '@/lib/utils/dates';
import { getSignedMediaUrl } from '@/lib/utils/storage';
import clsx from 'clsx';

export default function MemoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const memoryId = params?.id as string;

  const [memory, setMemory] = useState<Memory | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [signedThumbnails, setSignedThumbnails] = useState<Record<string, string>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [prevMemoryId, setPrevMemoryId] = useState<string | null>(null);
  const [nextMemoryId, setNextMemoryId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!memoryId) return;
    loadMemoryData();
  }, [memoryId]);

  async function loadMemoryData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch memory
      const { data: mem, error } = await supabase
        .from('memories')
        .select('*, category:categories(*), tags:memory_tags(tag:tags(*))')
        .eq('id', memoryId)
        .eq('user_id', user.id)
        .single();

      if (error || !mem) {
        setMemory(null);
        return;
      }

      setMemory(mem);

      // 2. Fetch media assets
      const { data: assets } = await supabase
        .from('media_assets')
        .select('*')
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: true });

      if (assets) {
        setMediaAssets(assets);
        // Pre-resolve signed URLs for thumbnails
        const thumbs: Record<string, string> = {};
        for (const a of assets) {
          const url = await getSignedMediaUrl(supabase, a.storage_path, 3600);
          if (url) thumbs[a.id] = url;
        }
        setSignedThumbnails(thumbs);
      }

      // 3. Find previous and next memory IDs for sequential navigation
      const { data: prev } = await supabase
        .from('memories')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .lt('event_date', mem.event_date)
        .order('event_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: next } = await supabase
        .from('memories')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .gt('event_date', mem.event_date)
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      setPrevMemoryId(prev?.id || null);
      setNextMemoryId(next?.id || null);
    } catch (err) {
      console.error('Error loading memory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite() {
    if (!memory) return;
    try {
      const nextFav = !memory.is_favorite;
      await supabase.from('memories').update({ is_favorite: nextFav }).eq('id', memory.id);
      setMemory({ ...memory, is_favorite: nextFav });
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  }

  async function handleToggleArchive() {
    if (!memory) return;
    try {
      const nextArchive = !memory.is_archived;
      await supabase.from('memories').update({ is_archived: nextArchive }).eq('id', memory.id);
      setMemory({ ...memory, is_archived: nextArchive });
    } catch (err) {
      console.error('Error toggling archive:', err);
    }
  }

  async function handleDeleteMemory() {
    if (!memory) return;
    setActionLoading(true);
    try {
      await supabase.from('memories').delete().eq('id', memory.id);
      router.push('/memories');
      router.refresh();
    } catch (err) {
      console.error('Delete memory error:', err);
    } finally {
      setActionLoading(false);
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

  if (!memory) {
    return (
      <AppLayout>
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Xotira topilmadi</h2>
          <p className="text-xs text-zinc-400 mb-6">
            Ushbu xotira o‘chirilgan bo‘lishi mumkin yoki sizda kirish huquqi yo‘q.
          </p>
          <Link
            href="/memories"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xotiralarga qaytish</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Controls Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/memories"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Barcha xotiralar</span>
          </Link>

          {/* Prev / Next navigation */}
          <div className="flex items-center gap-1.5">
            {prevMemoryId && (
              <Link
                href={`/memories/${prevMemoryId}`}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1"
                title="Oldingi xotira"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Oldingi</span>
              </Link>
            )}
            {nextMemoryId && (
              <Link
                href={`/memories/${nextMemoryId}`}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1"
                title="Keyingi xotira"
              >
                <span className="hidden sm:inline">Keyingi</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Memory Main Card */}
        <article className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative">
          {/* Metadata badges and action icons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/5 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatUzbekDate(memory.event_date)}
              </span>

              {memory.event_time && (
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {memory.event_time.slice(0, 5)}
                </span>
              )}

              {memory.location_name && (
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {memory.location_name}
                </span>
              )}

              {memory.category && (
                <span className="px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium">
                  {memory.category.name}
                </span>
              )}
            </div>

            {/* Actions: Favorite, Edit, Archive, Delete */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleFavorite}
                className={clsx(
                  'p-2 rounded-xl border transition-all',
                  memory.is_favorite
                    ? 'bg-pink-600/20 border-pink-500/40 text-pink-400'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                )}
                title="Sevimlilar"
              >
                <Heart className={clsx('w-4 h-4', memory.is_favorite && 'fill-pink-400')} />
              </button>

              <button
                onClick={handleToggleArchive}
                className={clsx(
                  'p-2 rounded-xl border transition-all',
                  memory.is_archived
                    ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                )}
                title={memory.is_archived ? 'Arxivdan chiqarish' : 'Arxivga o‘tkazish'}
              >
                <Archive className="w-4 h-4" />
              </button>

              <Link
                href={`/memories/${memory.id}/edit`}
                className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all"
                title="Tahrirlash"
              >
                <Edit className="w-4 h-4" />
              </Link>

              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
                title="O‘chirish"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-6">
            {memory.title || 'Sarlavhasiz xotira'}
          </h1>

          {/* Body Text */}
          {memory.body && (
            <div className="text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-8">
              {memory.body}
            </div>
          )}

          {/* Media Attachments Gallery */}
          {mediaAssets.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-white/5">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                Biriktirilgan fayllar ({mediaAssets.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mediaAssets.map((asset, index) => {
                  const thumbUrl = signedThumbnails[asset.id];
                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        setSelectedAssetIndex(index);
                        setViewerOpen(true);
                      }}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 cursor-pointer hover:border-violet-500 transition-all shadow-md"
                    >
                      {thumbUrl ? (
                        asset.media_type === 'video' ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-black/60">
                            <video src={thumbUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <span className="p-2 rounded-full bg-violet-600/80 text-white">▶</span>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={thumbUrl}
                            alt={asset.file_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-zinc-600 text-xs">
                          Yuklanmoqda...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="mt-10 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-zinc-400">
            <span>Yozilgan vaqti: {formatUzbekDate(memory.created_at)}</span>
            {memory.updated_at && memory.updated_at !== memory.created_at && (
              <span>Oxirgi tahrir: {formatUzbekDate(memory.updated_at)}</span>
            )}
          </div>
        </article>

        {/* Media Lightbox */}
        <MediaViewer
          assets={mediaAssets}
          initialIndex={selectedAssetIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setDeleteConfirmOpen(false)}
            />
            <div className="relative w-full max-w-sm bg-[#121217] border border-white/10 rounded-2xl p-6 z-10 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Xotirani o‘chirish</h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Haqiqatan ham bu xotirani va unga biriktirilgan fayllarni butunlay o‘chirmoqchimisiz? Ushbu amalni bekor qilib bo‘lmaydi.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMemory}
                  disabled={actionLoading}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-glow-sm transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'O‘chirilmoqda...' : 'O‘chirish'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
