'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { validateMediaFile, generateStoragePath, BUCKET_NAME } from '@/lib/utils/storage';
import { MediaAsset } from '@/lib/supabase/types';

interface UploadItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  asset?: MediaAsset;
}

export default function MediaUploader({
  memoryId,
  diaryEntryId,
  futureLetterId,
  onUploaded,
}: {
  memoryId?: string;
  diaryEntryId?: string;
  futureLetterId?: string;
  onUploaded?: (asset: MediaAsset) => void;
}) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: UploadItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        newItems.push({
          file,
          id: crypto.randomUUID(),
          progress: 0,
          status: 'error',
          errorMessage: validation.error,
        });
      } else {
        newItems.push({
          file,
          id: crypto.randomUUID(),
          progress: 0,
          status: 'pending',
        });
      }
    }

    setUploads((prev) => [...prev, ...newItems]);
    // Start uploading pending items
    newItems.forEach((item) => {
      if (item.status === 'pending') {
        uploadFileItem(item);
      }
    });
  };

  async function uploadFileItem(item: UploadItem) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Foydalanuvchi tizimga kirmagan');
      }

      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: 'uploading', progress: 20 } : u))
      );

      const storagePath = generateStoragePath(user.id, item.file.name);
      const isVideo = item.file.type.startsWith('video');

      // Upload to private Supabase storage bucket
      const { data: storageData, error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, item.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        throw storageError;
      }

      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, progress: 80 } : u))
      );

      // Save record in media_assets table
      const { data: assetData, error: dbError } = await supabase
        .from('media_assets')
        .insert({
          user_id: user.id,
          memory_id: memoryId || null,
          diary_entry_id: diaryEntryId || null,
          future_letter_id: futureLetterId || null,
          storage_path: storagePath,
          file_name: item.file.name,
          mime_type: item.file.type,
          file_size: item.file.size,
          media_type: isVideo ? 'video' : 'image',
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: 'completed', progress: 100, asset: assetData }
            : u
        )
      );

      if (onUploaded && assetData) {
        onUploaded(assetData);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: 'error', errorMessage: err.message || 'Yuklashda xatolik' }
            : u
        )
      );
    }
  }

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-violet-500 bg-violet-600/10'
            : 'border-white/10 hover:border-violet-500/50 hover:bg-white/5 bg-[#121217]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadCloud className="w-10 h-10 text-violet-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-white">
          Fayllarni bu yerga tashlang yoki bosing
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          JPG, PNG, WebP (20 MB gacha) va MP4, WebM videolar (250 MB gacha)
        </p>
      </div>

      {/* Upload Items Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                {item.file.type.startsWith('video') ? (
                  <VideoIcon className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{item.file.name}</p>
                  <p className="text-zinc-500 text-[10px]">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>

                  {/* Progress bar */}
                  {item.status === 'uploading' && (
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div
                        className="bg-violet-500 h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.status === 'error' && (
                    <p className="text-rose-400 text-[11px] mt-0.5">{item.errorMessage}</p>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {item.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                )}
                {item.status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <button
                  type="button"
                  onClick={() => removeUpload(item.id)}
                  className="p-1 rounded-md text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
