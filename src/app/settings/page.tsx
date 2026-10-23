'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Download,
  FileSpreadsheet,
  FileJson,
  FileArchive,
  Bell,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Profile, NotificationPreferences } from '@/lib/supabase/types';
import {
  FullExportData,
  downloadJsonExport,
  downloadMemoriesCsv,
  downloadDatesCsv,
  downloadZipBackup,
} from '@/lib/utils/export';
import clsx from 'clsx';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Tashkent');
  const [dateFormat, setDateFormat] = useState('DD.MM.YYYY');

  // Notification Preferences
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    user_id: '',
    push_enabled: true,
    email_enabled: false,
    birthday_reminders_enabled: true,
    future_letter_reminders_enabled: true,
    default_reminder_minutes: 60,
    updated_at: '',
  });

  // Storage and stats
  const [storageUsageBytes, setStorageUsageBytes] = useState(0);
  const [totalFilesCount, setTotalFilesCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');

      // 1. Load Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (prof) {
        setProfile(prof);
        setDisplayName(prof.display_name || '');
        setTimezone(prof.timezone || 'Asia/Tashkent');
        setDateFormat(prof.date_format || 'DD.MM.YYYY');
      } else {
        setDisplayName(user.email?.split('@')[0] || '');
      }

      // 2. Load Notification Preferences
      const { data: prefData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefData) {
        setPrefs(prefData);
      }

      // 3. Calculate Media Storage Usage
      const { data: media } = await supabase
        .from('media_assets')
        .select('file_size')
        .eq('user_id', user.id);

      if (media) {
        setTotalFilesCount(media.length);
        const bytes = media.reduce((acc, curr) => acc + (Number(curr.file_size) || 0), 0);
        setStorageUsageBytes(bytes);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kirilmagan');

      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          timezone,
          date_format: dateFormat,
          theme: 'dark',
        });

      await supabase
        .from('notification_preferences')
        .upsert({
          ...prefs,
          user_id: user.id,
        });

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSavingProfile(false);
    }
  }

  async function fetchCompleteData(): Promise<FullExportData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kirilmagan');

    const [
      profRes,
      catRes,
      tagRes,
      memRes,
      diaryRes,
      datesRes,
      remRes,
      lettersRes,
      mediaRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('tags').select('*').eq('user_id', user.id),
      supabase.from('memories').select('*').eq('user_id', user.id),
      supabase.from('diary_entries').select('*').eq('user_id', user.id),
      supabase.from('important_dates').select('*').eq('user_id', user.id),
      supabase.from('reminders').select('*').eq('user_id', user.id),
      supabase.from('future_letters').select('*').eq('user_id', user.id),
      supabase.from('media_assets').select('*').eq('user_id', user.id),
    ]);

    return {
      profile: profRes.data || null,
      categories: catRes.data || [],
      tags: tagRes.data || [],
      memories: memRes.data || [],
      diary_entries: diaryRes.data || [],
      important_dates: datesRes.data || [],
      reminders: remRes.data || [],
      future_letters: lettersRes.data || [],
      media_assets: mediaRes.data || [],
      exported_at: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  async function handleExportJson() {
    setExporting('json');
    try {
      const data = await fetchCompleteData();
      downloadJsonExport(data);
    } catch (err) {
      console.error('JSON export error:', err);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportCsv() {
    setExporting('csv');
    try {
      const data = await fetchCompleteData();
      downloadMemoriesCsv(data.memories);
      downloadDatesCsv(data.important_dates);
    } catch (err) {
      console.error('CSV export error:', err);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportZip() {
    setExporting('zip');
    try {
      const data = await fetchCompleteData();
      await downloadZipBackup(data);
    } catch (err) {
      console.error('ZIP backup error:', err);
    } finally {
      setExporting(null);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmationInput !== 'OCHIRISH') {
      alert('Iltimos, tasdiqlash uchun "OCHIRISH" so‘zini kiriting');
      return;
    }

    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete user profile and cascade all user data via DB CASCADE
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Delete account error:', err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-violet-400" />
            <span>Sozlamalar va Zaxira</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Profil, bildirishnomalar, xotira hajmi va ma’lumotlarni eksport qilish
          </p>
        </div>

        {/* Profile Settings */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-6">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Profil Sozlamalari</h2>
              <p className="text-xs text-zinc-400">Shaxsiy hisob parametrlari</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Ismingiz / Taxallus
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email manzil (O‘zgartirib bo‘lmaydi)
                </label>
                <input
                  type="text"
                  disabled
                  value={userEmail}
                  className="w-full bg-[#141418] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Vaqt zonasi (Standart)
                </label>
                <input
                  type="text"
                  disabled
                  value={timezone}
                  className="w-full bg-[#141418] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Sana formati
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="DD.MM.YYYY">DD.MM.YYYY (23.10.2024)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2024-10-23)</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY (23-10-2024)</option>
                </select>
              </div>
            </div>

            {/* Notification checkboxes */}
            <div className="pt-4 border-t border-white/5 space-y-2.5">
              <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-2">
                <Bell className="w-3.5 h-3.5 text-violet-400" />
                <span>Bildirishnomalar</span>
              </h3>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={prefs.push_enabled}
                  onChange={(e) => setPrefs({ ...prefs, push_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600 bg-zinc-800 border-white/20"
                />
                <span>Brauzer push bildirishnomalari ruxsat etilsin</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={prefs.birthday_reminders_enabled}
                  onChange={(e) => setPrefs({ ...prefs, birthday_reminders_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600 bg-zinc-800 border-white/20"
                />
                <span>Tug‘ilgan kunlar va yubileylar kuni eslatma chiqsin</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={prefs.future_letter_reminders_enabled}
                  onChange={(e) => setPrefs({ ...prefs, future_letter_reminders_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600 bg-zinc-800 border-white/20"
                />
                <span>Kelajak xati ochilish vaqti kelganda ogohlantirilsin</span>
              </label>
            </div>

            <div className="pt-4 flex items-center justify-between">
              {profileSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
                  <CheckCircle className="w-4 h-4" />
                  Sozlamalar saqlandi!
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Saqlash</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Storage Usage Widget */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Xotira Hajmi va Fayllar</h2>
              <p className="text-xs text-zinc-400">Supabase Storage foydalanish statistikasi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
              <span className="text-xs text-zinc-400 font-medium">Jami biriktirilgan fayllar</span>
              <p className="text-2xl font-bold text-white mt-1">{totalFilesCount} ta</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
              <span className="text-xs text-zinc-400 font-medium">Bant qilingan hajm</span>
              <p className="text-2xl font-bold text-white mt-1">
                {(storageUsageBytes / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>

        {/* Data Export & Backup Section (Requirement 17) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-6">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Eksport va Zaxiralash</h2>
              <p className="text-xs text-zinc-400">
                Barcha xotiralaringizni offline saqlash uchun yuklab oling
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* JSON Export */}
            <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 flex flex-col justify-between">
              <div>
                <FileJson className="w-8 h-8 text-amber-400 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">To‘liq JSON Zaxira</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Barcha xotiralar, kundalik, sanalar, teglar va kategoriyalarning to‘liq tuzilmali fayli.
                </p>
              </div>
              <button
                onClick={handleExportJson}
                disabled={exporting === 'json'}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {exporting === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>JSON yuklab olish</span>
              </button>
            </div>

            {/* CSV Export */}
            <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 flex flex-col justify-between">
              <div>
                <FileSpreadsheet className="w-8 h-8 text-emerald-400 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Jadval (CSV)</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Excel yoki Google Sheets dasturlarida ochish mumkin bo‘lgan xotiralar va sanalar jadvali.
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                disabled={exporting === 'csv'}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {exporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>CSV yuklab olish</span>
              </button>
            </div>

            {/* Complete ZIP Backup */}
            <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 flex flex-col justify-between">
              <div>
                <FileArchive className="w-8 h-8 text-violet-400 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">ZIP Arxiv Paketi</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  JSON, CSV fayllar va to‘liq metadatalarni bitta arxiv paketi ko‘rinishida yuklash.
                </p>
              </div>
              <button
                onClick={handleExportZip}
                disabled={exporting === 'zip'}
                className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-glow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {exporting === 'zip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>ZIP Arxivini yuklash</span>
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone: Account Deletion (Requirement 16.4) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-rose-500/20 bg-rose-950/10 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-rose-500/10 mb-4">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Xavfli Hudud</h2>
              <p className="text-xs text-rose-300">Akkaunt va barcha xotiralarni o‘chirish</p>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed mb-4">
            Akkauntingizni o‘chirsangiz, barcha xotiralar, fotosuratlar, videolar, kundalik yozuvlari va kelajak xatlari butunlay yo‘qotiladi. Ushbu amalni qaytarib bo‘lmaydi.
          </p>

          <button
            onClick={() => setDeleteAccountModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-glow-sm flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Akkauntni butunlay o‘chirish</span>
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setDeleteAccountModal(false)}
            />
            <div className="relative w-full max-w-md bg-[#121217] border border-rose-500/30 rounded-3xl p-6 z-10 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Qat’iy ogohlantirish!</h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Barcha ma’lumotlaringiz o‘chiriladi. Davom etish uchun quyidagi maydonga{' '}
                <strong className="text-white">&ldquo;OCHIRISH&rdquo;</strong> so‘zini kiriting:
              </p>
              <input
                type="text"
                placeholder="OCHIRISH"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-center text-xs text-white focus:outline-none focus:border-rose-500 mb-4"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteAccountModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmationInput !== 'OCHIRISH'}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-glow-sm disabled:opacity-40"
                >
                  {deleting ? 'O‘chirilmoqda...' : 'Tasdiqlayman'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
