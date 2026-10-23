'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Heart,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import MediaViewer from '@/components/media/MediaViewer';
import MediaUploader from '@/components/media/MediaUploader';
import { createClient } from '@/lib/supabase/client';
import { MediaAsset } from '@/lib/supabase/types';
import { getSignedMediaUrl } from '@/lib/utils/storage';
import { formatUzbekDate } from '@/lib/utils/dates';
import clsx from 'clsx';

export default function GalleryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [signedThumbnails, setSignedThumbnails] = useState<Record<string, string>>({});
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadGalleryAssets();
  }, [filterType, onlyFavorites, sortOrder]);

  async function loadGalleryAssets() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('media_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (filterType !== 'all') {
        query = query.eq('media_type', filterType);
      }

      if (onlyFavorites) {
        query = query.eq('is_favorite', true);
      }

      const { data, error } = await query;
      if (!error && data) {
        setAssets(data);

        // Fetch signed URLs for thumbnails
        const thumbs: Record<string, string> = {};
        for (const item of data) {
          const url = await getSignedMediaUrl(supabase, item.storage_path, 3600);
          if (url) thumbs[item.id] = url;
        }
        setSignedThumbnails(thumbs);
      }
    } catch (err) {
      console.error('Gallery load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(assetId: string, currentStatus: boolean, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await supabase.from('media_assets').update({ is_favorite: !currentStatus }).eq('id', assetId);
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, is_favorite: !currentStatus } : a))
      );
    } catch (err) {
      console.error('Toggle asset favorite error:', err);
    }
  }

  async function deleteAsset(assetId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Ushbu faylni o‘chirishni tasdiqlaysizmi?')) return;
    try {
      await supabase.from('media_assets').delete().eq('id', assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      console.error('Delete asset error:', err);
    }
  }

  const filteredAssets = assets.filter((a) => {
    if (!searchQuery.trim()) return true;
    return a.file_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-violet-400" />
              <span>Foto va Video Galereyasi</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Barcha rasmlar va videolaringiz xavfsiz va shaxsiy saqlanadi
            </p>
          </div>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Fayl yuklash</span>
          </button>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Fayl nomi bo‘yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121217] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                filterType === 'all'
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                  : 'bg-[#121217] border-white/10 text-zinc-400 hover:text-white'
              )}
            >
              Hammasi
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5',
                filterType === 'image'
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#121217] border-white/10 text-zinc-400 hover:text-white'
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Rasmlar</span>
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5',
                filterType === 'video'
                  ? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#121217] border-white/10 text-zinc-400 hover:text-white'
              )}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Videolar</span>
            </button>
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={clsx(
              'px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all',
              onlyFavorites
                ? 'bg-pink-600/20 border-pink-500/40 text-pink-300'
                : 'bg-[#121217] border-white/10 text-zinc-400 hover:text-white'
            )}
          >
            <Heart className={clsx('w-3.5 h-3.5', onlyFavorites && 'fill-pink-400 text-pink-400')} />
            <span>Sevimlilar</span>
          </button>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-3.5 py-2 rounded-xl bg-[#121217] border border-white/10 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1.5"
            title="Tartib"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Yangi' : 'Eski'}</span>
          </button>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="aspect-square rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/10">
            <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Fayllar mavjud emas</h3>
            <p className="text-xs text-zinc-400 mb-6 max-w-sm mx-auto">
              Galereyangizga fotosuratlar va esdalik videolarini yuklang.
            </p>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Fayl yuklash</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredAssets.map((asset, index) => {
              const url = signedThumbnails[asset.id];
              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    setSelectedAssetIndex(index);
                    setViewerOpen(true);
                  }}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 cursor-pointer hover:border-violet-500/60 transition-all shadow-md"
                >
                  {url ? (
                    asset.media_type === 'video' ? (
                      <div className="relative w-full h-full bg-black/80 flex items-center justify-center">
                        <video src={url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="p-2 rounded-full bg-violet-600/80 text-white text-xs">▶</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={asset.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-zinc-600 text-xs">
                      Yuklanmoqda...
                    </div>
                  )}

                  {/* Gradient Overlay & Controls on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm">
                        {asset.media_type === 'video' ? 'Video' : 'Rasm'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(asset.id, asset.is_favorite, e)}
                          className="p-1 rounded-md bg-black/50 text-white hover:text-pink-400"
                        >
                          <Heart
                            className={clsx('w-3.5 h-3.5', asset.is_favorite && 'fill-pink-500 text-pink-500')}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteAsset(asset.id, e)}
                          className="p-1 rounded-md bg-black/50 text-white hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-white font-medium truncate">{asset.file_name}</p>
                      <p className="text-[10px] text-zinc-400">{formatUzbekDate(asset.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Media Viewer Lightbox */}
        <MediaViewer
          assets={filteredAssets}
          initialIndex={selectedAssetIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setUploadModalOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-[#121217] border border-white/10 rounded-3xl p-6 z-10 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-4">Galereyaga yangi fayllar yuklash</h3>
              <MediaUploader
                onUploaded={(newAsset) => {
                  setAssets((prev) => [newAsset, ...prev]);
                  getSignedMediaUrl(supabase, newAsset.storage_path, 3600).then((url) => {
                    if (url) {
                      setSignedThumbnails((prev) => ({ ...prev, [newAsset.id]: url }));
                    }
                  });
                }}
              />
              <div className="mt-4 text-right">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
