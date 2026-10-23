'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Send,
  Lock,
  Unlock,
  Plus,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  Loader2,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { FutureLetter } from '@/lib/supabase/types';
import { formatUzbekDate, formatTimeRemaining } from '@/lib/utils/dates';
import clsx from 'clsx';

export default function FutureLettersPage() {
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [readLetter, setReadLetter] = useState<FutureLetter | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [unlockDate, setUnlockDate] = useState(() => {
    // Default to 1 year from now
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [unlockTime, setUnlockTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadLetters();
  }, []);

  async function loadLetters() {
    setLoading(true);
    try {
      // Call safe server API endpoint
      const res = await fetch('/api/letters/safe');
      const data = await res.json();
      if (data.letters) {
        setLetters(data.letters);
      }
    } catch (err) {
      console.error('Error fetching safe letters:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLetter(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !body.trim()) {
      setErrorMsg('Xat sarlavhasi va matnini to‘liq kiriting!');
      return;
    }

    const unlockTimestamp = new Date(`${unlockDate}T${unlockTime}:00`).toISOString();
    if (new Date(unlockTimestamp).getTime() <= Date.now()) {
      setErrorMsg('Ochilish vaqti kelajakda bo‘lishi shart!');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kirilmagan');

      const { data, error } = await supabase.from('future_letters').insert({
        user_id: user.id,
        title: title.trim(),
        body: body.trim(),
        unlock_at: unlockTimestamp,
        reminder_enabled: reminderEnabled,
        status: 'locked',
      }).select().single();

      if (error) throw error;

      setModalOpen(false);
      setTitle('');
      setBody('');
      loadLetters();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xatni saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenLetter(letter: FutureLetter) {
    setOpeningId(letter.id);
    try {
      const res = await fetch(`/api/letters/${letter.id}/open`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Xatni ochish imkoni bo‘lmadi');
        return;
      }

      // Celebrate with confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setReadLetter(data.letter);
      loadLetters();
    } catch (err) {
      console.error('Open letter error:', err);
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDeleteLetter(letterId: string) {
    if (!confirm('Ushbu kelajak xatini bekor qilish va o‘chirishni xohlaysizmi?')) return;
    try {
      await supabase.from('future_letters').delete().eq('id', letterId);
      setLetters((prev) => prev.filter((l) => l.id !== letterId));
    } catch (err) {
      console.error('Delete letter error:', err);
    }
  }

  const lockedLetters = letters.filter((l) => !l.is_unlocked && l.status !== 'opened');
  const unlockedLetters = letters.filter((l) => l.is_unlocked || l.status === 'opened');

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Send className="w-6 h-6 text-violet-400" />
              <span>Kelajak Xatlari & Vaqt Kapsulasi</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Kelajakdagi o‘zingizga xat yozing va belgilangan muddat kelganda oching
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Kelajakka xat yozish</span>
          </button>
        </div>

        {/* Security Banner */}
        <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-4 flex items-center gap-3 text-xs text-zinc-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="leading-relaxed">
            <strong className="text-white">Qat’iy xavfsizlik:</strong> Belgilangan ochilish vaqti kelmaguncha, xat matni server orqali ham taqdim etilmaydi (Server-side redaction).
          </p>
        </div>

        {/* Locked Time Capsule Letters Section */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-400" />
            <span>Yopiq Vaqt Kapsulalari ({lockedLetters.length})</span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : lockedLetters.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-xs text-zinc-500 border border-dashed border-white/10">
              Hozirda yopiq kelajak xatlari yo‘q. Kelajakdagi o‘zingizga eslatma qoldirish uchun xat yozing!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedLetters.map((letter) => {
                const remaining = formatTimeRemaining(letter.unlock_at);
                return (
                  <div
                    key={letter.id}
                    className="glass-panel p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/20 to-[#121217] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="p-2 rounded-xl bg-violet-600/20 text-violet-300">
                          <Lock className="w-4 h-4" />
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteLetter(letter.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Bekor qilish va o‘chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1 truncate">
                        {letter.title}
                      </h3>
                      <p className="text-xs text-zinc-400 italic mb-4">
                        🔒 Xat qulflangan. Ochilish vaqti kelmaguncha matn maxfiy saqlanadi.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-500">Ochilish sanasi:</span>
                        <span className="text-zinc-300 font-medium">
                          {formatUzbekDate(letter.unlock_at)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-violet-600/10 text-violet-300 text-center text-xs font-semibold">
                        ⏳ {remaining.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unlocked / Opened Letters Section */}
        <div className="space-y-4 pt-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Unlock className="w-4 h-4 text-emerald-400" />
            <span>Ochilishga tayyor yoki ochilgan xatlar ({unlockedLetters.length})</span>
          </h2>

          {unlockedLetters.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-xs text-zinc-500 border border-white/5">
              Hali ochilgan xatlar yo‘q
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedLetters.map((letter) => {
                const isOpened = letter.status === 'opened';
                return (
                  <div
                    key={letter.id}
                    className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-[#121217] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="p-2 rounded-xl bg-emerald-600/20 text-emerald-300">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
                          {isOpened ? 'Ochilgan' : 'Ochishga tayyor!'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-2">{letter.title}</h3>
                      <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                        {letter.body || 'Xatni ochish tugmasini bosing'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        {formatUzbekDate(letter.unlock_at)}
                      </span>
                      {isOpened ? (
                        <button
                          onClick={() => setReadLetter(letter)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>O‘qish</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenLetter(letter)}
                          disabled={openingId === letter.id}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-glow-sm flex items-center gap-1.5"
                        >
                          {openingId === letter.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                          <span>Xatni ochish</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Read Full Letter Modal */}
        {readLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setReadLetter(null)}
            />
            <div className="relative w-full max-w-lg bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-8 z-10 shadow-2xl">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{readLetter.title}</h3>
                  <p className="text-xs text-zinc-400">
                    O‘tmishdan kelgan xat • {formatUzbekDate(readLetter.unlock_at)}
                  </p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto pr-1 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap custom-scrollbar mb-6">
                {readLetter.body}
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setReadLetter(null)}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compose New Letter Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-8 z-10 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Kelajakdagi o‘zingizga xat yozing</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Ushbu xat belgilangan sanagacha qulflanadi va unga faqat o‘sha kuni ruxsat beriladi.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateLetter} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Xat sarlavhasi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: 5 yildan keyingi menga maktub"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Ochilish sanasi *
                    </label>
                    <input
                      type="date"
                      required
                      value={unlockDate}
                      onChange={(e) => setUnlockDate(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Ochilish vaqti
                    </label>
                    <input
                      type="time"
                      value={unlockTime}
                      onChange={(e) => setUnlockTime(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Xat matni *
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Kelajakdagi o‘zingizga bugungi orzularingiz, maqsadlaringiz va hozirgi hislaringiz haqida yozing..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500 leading-relaxed custom-scrollbar"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 pt-1">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600 bg-zinc-800 border-white/20"
                  />
                  <span>Ochilish kuni eslatma bildirishnomasi yuborilsin</span>
                </label>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm disabled:opacity-50"
                  >
                    {saving ? 'Qulflanmoqda...' : 'Kapsulani qulflash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
