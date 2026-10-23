'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Maximize2, Loader2 } from 'lucide-react';
import { MediaAsset } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import { getSignedMediaUrl } from '@/lib/utils/storage';

export default function MediaViewer({
  assets,
  initialIndex = 0,
  isOpen,
  onClose,
}: {
  assets: MediaAsset[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentAsset = assets[currentIndex];

  useEffect(() => {
    if (!isOpen || !currentAsset) return;

    let isMounted = true;
    async function fetchUrl() {
      setLoading(true);
      try {
        const url = await getSignedMediaUrl(supabase, currentAsset.storage_path, 3600);
        if (isMounted) setSignedUrl(url);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [currentIndex, isOpen, currentAsset]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentIndex, assets.length]);

  const nextSlide = () => {
    if (currentIndex < assets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // loop
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(assets.length - 1); // loop
    }
  };

  if (!isOpen || !currentAsset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl select-none animate-in fade-in duration-200">
      {/* Top Bar Actions */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 text-white">
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md">
          {currentIndex + 1} / {assets.length} — {currentAsset.file_name}
        </span>
        <div className="flex items-center gap-2">
          {signedUrl && (
            <a
              href={signedUrl}
              download={currentAsset.file_name}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
              title="Yuklab olish"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
            title="Yopish (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {assets.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Media Content Display */}
      <div className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="text-xs text-zinc-400">Fayl ochilmoqda...</p>
          </div>
        ) : signedUrl ? (
          currentAsset.media_type === 'video' ? (
            <video
              src={signedUrl}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl"
            />
          ) : (
            <img
              src={signedUrl}
              alt={currentAsset.file_name}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          )
        ) : (
          <div className="text-rose-400 text-sm">Faylni yuklab bo‘lmadi</div>
        )}
      </div>
    </div>
  );
}
