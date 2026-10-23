import { createClient } from '@/lib/supabase/client';

export const BUCKET_NAME = 'memories-media';

// Max sizes: 20MB for images, 250MB for videos
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 250 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

/**
 * Validates file type and size
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string; mediaType?: 'image' | 'video' } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `Ruxsat etilmagan format (${file.type}). Faqat JPG, PNG, WebP va MP4, WebM formatlari qabul qilinadi.`,
    };
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Rasm hajmi juda katta (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maksimal ruxsat: 20 MB.`,
    };
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `Video hajmi juda katta (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maksimal ruxsat: 250 MB.`,
    };
  }

  return {
    valid: true,
    mediaType: isImage ? 'image' : 'video',
  };
}

/**
 * Generate safe, non-guessable storage path: {userId}/{uuid}.{extension}
 */
export function generateStoragePath(userId: string, originalFileName: string): string {
  const ext = originalFileName.split('.').pop()?.toLowerCase() || 'bin';
  const cleanExt = ext.replace(/[^a-z0-9]/g, '');
  const uniqueId = crypto.randomUUID();
  return `${userId}/${uniqueId}.${cleanExt}`;
}

/**
 * In-memory cache for signed URLs to minimize Supabase calls
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get signed URL for a private storage path
 */
export async function getSignedMediaUrl(
  supabase: any,
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!storagePath) return null;

  // Check cache
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now() + 60 * 1000) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error('Storage signed URL error:', error);
      return null;
    }

    signedUrlCache.set(storagePath, {
      url: data.signedUrl,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.error('getSignedMediaUrl exception:', err);
    return null;
  }
}
