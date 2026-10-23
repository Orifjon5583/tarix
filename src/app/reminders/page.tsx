'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  CheckCircle,
  X,
  Trash2,
  Edit,
  Repeat,
  Loader2,
  Play,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Reminder, RecurrenceType } from '@/lib/supabase/types';
import { formatUzbekDate } from '@/lib/utils/dates';
import clsx from 'clsx';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Takrorlanmaydi' },
  { value: 'daily', label: 'Har kuni' },
  { value: 'weekly', label: 'Har hafta' },
  { value: 'monthly', label: 'Har oy' },
  { value: 'yearly', label: 'Har yili' },
];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedDate, setSchedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [schedTime, setSchedTime] = useState('09:00');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testProcessing, setTestProcessing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true });

      if (!error && data) {
        setReminders(data);
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setSchedDate(new Date().toISOString().split('T')[0]);
    setSchedTime('09:00');
    setRecurrence('none');
    setModalOpen(true);
  }

  function openEditModal(rem: Reminder) {
    setEditingId(rem.id);
    setTitle(rem.title);
    setDescription(rem.description || '');
    const dateObj = new Date(rem.scheduled_at);
    setSchedDate(dateObj.toISOString().split('T')[0]);
    setSchedTime(rem.scheduled_at.split('T')[1].slice(0, 5));
    setRecurrence(rem.recurrence_rule);
    setModalOpen(true);
  }

  async function handleSaveReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kirilmagan');

      const fullScheduledAt = new Date(`${schedDate}T${schedTime}:00`).toISOString();

      if (editingId) {
        await supabase
          .from('reminders')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            scheduled_at: fullScheduledAt,
            recurrence_rule: recurrence,
          })
          .eq('id', editingId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('reminders').insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          scheduled_at: fullScheduledAt,
          recurrence_rule: recurrence,
          is_active: true,
        });
      }

      setModalOpen(false);
      loadReminders();
    } catch (err) {
      console.error('Save reminder error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rem: Reminder) {
    try {
      await supabase
        .from('reminders')
        .update({ is_active: !rem.is_active })
        .eq('id', rem.id);

      setReminders((prev) =>
        prev.map((r) => (r.id === rem.id ? { ...r, is_active: !rem.is_active } : r))
      );
    } catch (err) {
      console.error('Toggle reminder active error:', err);
    }
  }

  async function handleDeleteReminder(id: string) {
    if (!confirm('Ushbu eslatmani o‘chirmoqchimisiz?')) return;
    try {
      await supabase.from('reminders').delete().eq('id', id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Delete reminder error:', err);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-400" />
              <span>Eslatmalar va Bildirishnomalar</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Rejalashtirilgan eslatmalar va bildirishnoma sozlamalari
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Eslatma yaratish</span>
            </button>
          </div>
        </div>

        {/* Reminders List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/10">
            <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Eslatmalar yo‘q</h3>
            <p className="text-xs text-zinc-400 mb-6 max-w-sm mx-auto">
              Hech qanday muhim voqeani unutmaslik uchun o‘zingizga eslatma belgilang.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi eslatma yaratish</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className={clsx(
                  'glass-panel p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  rem.is_active ? 'border-white/10' : 'border-white/5 opacity-60'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(rem)}
                    className={clsx(
                      'p-2 rounded-xl border mt-0.5 transition-all',
                      rem.is_active
                        ? 'bg-amber-600/20 border-amber-500/30 text-amber-400'
                        : 'bg-zinc-800 border-white/10 text-zinc-500'
                    )}
                    title={rem.is_active ? 'Faol eslatma' : 'O‘chirilgan'}
                  >
                    <Bell className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <h3 className={clsx('text-sm font-bold text-white', !rem.is_active && 'line-through text-zinc-400')}>
                      {rem.title}
                    </h3>
                    {rem.description && (
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{rem.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-violet-400" />
                        {formatUzbekDate(rem.scheduled_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-violet-400" />
                        {rem.scheduled_at.split('T')[1].slice(0, 5)}
                      </span>
                      {rem.recurrence_rule !== 'none' && (
                        <span className="flex items-center gap-1 text-violet-300">
                          <Repeat className="w-3 h-3" />
                          {RECURRENCE_OPTIONS.find((r) => r.value === rem.recurrence_rule)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(rem)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative w-full max-w-md bg-[#121217] border border-white/10 rounded-3xl p-6 z-10 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-4">
                {editingId ? 'Eslatmani tahrirlash' : 'Yangi eslatma yaratish'}
              </h3>

              <form onSubmit={handleSaveReminder} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Sarlavha *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Uy arxivini tekshirish"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Sana *
                    </label>
                    <input
                      type="date"
                      required
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Vaqt
                    </label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Takrorlanish
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tavsif (ixtiyoriy)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Eslatma tafsilotlari..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

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
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm disabled:opacity-50"
                  >
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
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
