export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MoodType =
  | 'happy'
  | 'blessed'
  | 'loved'
  | 'excited'
  | 'thoughtful'
  | 'nostalgic'
  | 'peaceful'
  | 'sad';

export type ImportantDateType =
  | 'birthday'
  | 'anniversary'
  | 'wedding'
  | 'personal'
  | 'milestone'
  | 'education'
  | 'work'
  | 'other';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type LetterStatusType = 'draft' | 'locked' | 'ready' | 'opened' | 'cancelled';

export type NotificationType = 'reminder' | 'birthday' | 'anniversary' | 'future_letter' | 'system';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  timezone: string;
  date_format: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  registration_locked: boolean;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  user_id: string;
  memory_id: string | null;
  diary_entry_id: string | null;
  future_letter_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  media_type: 'image' | 'video';
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  is_favorite: boolean;
  created_at: string;
  signedUrl?: string; // dynamically populated for secure view
}

export interface Memory {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  event_date: string; // YYYY-MM-DD
  event_time: string | null; // HH:mm:ss
  location_name: string | null;
  category_id: string | null;
  mood: MoodType | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  tags?: Tag[];
  media?: MediaAsset[];
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  entry_date: string; // YYYY-MM-DD
  mood: MoodType | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  media?: MediaAsset[];
}

export interface ImportantDate {
  id: string;
  user_id: string;
  title: string;
  date_type: ImportantDateType;
  event_date: string; // YYYY-MM-DD
  repeat_yearly: boolean;
  description: string | null;
  reminder_enabled: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  // Computed helpers for UI
  days_until?: number;
  next_occurrence?: string;
  years_count?: number;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  timezone: string;
  recurrence_rule: RecurrenceType;
  is_active: boolean;
  next_run_at: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FutureLetter {
  id: string;
  user_id: string;
  title: string;
  body: string | null; // NULL if still locked!
  unlock_at: string;
  timezone: string;
  status: LetterStatusType;
  opened_at: string | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
  is_unlocked?: boolean;
  media?: MediaAsset[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: NotificationType;
  scheduled_at: string;
  sent_at: string | null;
  read_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'read';
  deduplication_key: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  birthday_reminders_enabled: boolean;
  future_letter_reminders_enabled: boolean;
  default_reminder_minutes: number;
  updated_at: string;
}
