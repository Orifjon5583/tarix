'use client';

import { useState, useEffect } from 'react';
import {
  CalendarHeart,
  Plus,
  Search,
  Heart,
  Trash2,
  Calendar,
  Sparkles,
  Cake,
  Bell,
  Loader2,
  Edit,
  ArrowUpDown,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { ImportantDate, ImportantDateType } from '@/lib/supabase/types';
import { formatUzbekDate, calculateNextOccurrence } from '@/lib/utils/dates';
import clsx from 'clsx';

const DATE_TYPES: { value: ImportantDateType; label: string; icon: string }[] = [
  { value: 'birthday', label: 'Tug‘ilgan kun', icon: '🎂' },
  { value: 'anniversary', label: 'Yubiley / Yillik', icon: '🥂' },
  { value: 'wedding', label: 'To‘y kuni', icon: '💍' },
  { value: 'personal', label: 'Shaxsiy voqea', icon: '🌟' },
  { value: 'milestone', label: 'Muhim bosqich', icon: '🏆' },
  { value: 'education', label: 'Ta’lim', icon: '🎓' },
  { value: 'work', label: 'Ish / Faoliyat', icon: '💼' },
  { value: 'other', label: 'Boshqa', icon: '📌' },
];

export default function ImportantDatesPage() {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [dateType, setDateType] = useState<ImportantDateType>('birthday');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repeatYearly, setRepeatYearly] = useState(true);
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadDates();
  }, []);

  async function loadDates() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('important_dates')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data) {
        const computed = data
          .map((d) => {
            const calc = calculateNextOccurrence(d.event_date, d.repeat_yearly);
            return {
              ...d,
              days_until: calc.daysUntil,
              next_occurrence: calc.nextDate.toISOString().split('T')[0],
              years_count: calc.yearsPassed,
              is_today: calc.isToday,
            };
          })
          .sort((a, b) => (a.days_until ?? 999) - (b.days_until ?? 999));

        setDates(computed);
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setTitle('');
    setDateType('birthday');
    setEventDate(new Date().toISOString().split('T')[0]);
    setRepeatYearly(true);
    setDescription('');
    setReminderEnabled(true);
    setIsFavorite(false);
    setModalOpen(true);
  }

  function openEditModal(d: ImportantDate) {
    setEditingId(d.id);
    setTitle(d.title);
    setDateType(d.date_type);
    setEventDate(d.event_date);
    setRepeatYearly(d.repeat_yearly);
    setDescription(d.description || '');
    setReminderEnabled(d.reminder_enabled);
    setIsFavorite(d.is_favorite);
    setModalOpen(true);
  }

  async function handleSaveDate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kirilmagan');

      if (editingId) {
        await supabase
          .from('important_dates')
          .update({
            title: title.trim(),
            date_type: dateType,
            event_date: eventDate,
            repeat_yearly: repeatYearly,
            description: description.trim() || null,
            reminder_enabled: reminderEnabled,
            is_favorite: isFavorite,
          })
          .eq('id', editingId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('important_dates').insert({
          user_id: user.id,
          title: title.trim(),
          date_type: dateType,
          event_date: eventDate,
          repeat_yearly: repeatYearly,
          description: description.trim() || null,
          reminder_enabled: reminderEnabled,
          is_favorite: isFavorite,
        });
      }

      setModalOpen(false);
      loadDates();
    } catch (err) {
      console.error('Save date error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDate(id: string) {
    if (!confirm('Ushbu sanani o‘chirishni xohlaysizmi?')) return;
    try {
      await supabase.from('important_dates').delete().eq('id', id);
      setDates((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Delete date error:', err);
    }
  }

  const filteredDates = dates.filter((d) => {
    if (filterType !== 'all' && d.date_type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CalendarHeart className="w-6 h-6 text-pink-400" />
              <span>Muhim Sanalar va Tug‘ilgan Kunlar</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Yillik takrorlanuvchi bayramlar, yubileylar va yaqinlaringiz kunlari
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-glow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Sana qo‘shish</span>
          </button>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Muhim sanalarni qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121217] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#121217] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
          >
            <option value="all">Barcha turlar</option>
            {DATE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredDates.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/10">
            <Cake className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Muhim sanalar yo‘q</h3>
            <p className="text-xs text-zinc-400 mb-6 max-w-sm mx-auto">
              Yaqinlaringizning tug‘ilgan kunlari va oilaviy bayramlarni kiriting.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-glow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi sana kiritish</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDates.map((item) => {
              const typeMeta = DATE_TYPES.find((t) => t.value === item.date_type);
              const isToday = item.days_until === 0;

              return (
                <div
                  key={item.id}
                  className={clsx(
                    'glass-panel p-5 rounded-2xl border flex flex-col justify-between group transition-all relative overflow-hidden',
                    isToday
                      ? 'border-pink-500/50 bg-gradient-to-br from-pink-950/30 to-[#121217] shadow-glow'
                      : 'border-white/5 hover:border-violet-500/30'
                  )}
                >
                  {isToday && (
                    <div className="absolute top-0 right-0 bg-pink-600 text-white text-[10px] uppercase tracking-wider font-extrabold px-3 py-0.5 rounded-bl-xl shadow-glow-sm">
                      Bugun nishonlanmoqda!
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-lg">{typeMeta?.icon || '📌'}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1 text-zinc-500 hover:text-white"
                          title="Tahrirlash"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDate(item.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors mb-1">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-400 text-[11px] block">
                        {formatUzbekDate(item.event_date)}
                      </span>
                      {item.years_count !== undefined && item.years_count > 0 && (
                        <span className="text-violet-400 text-[10px] font-semibold">
                          {item.date_type === 'birthday'
                            ? `${item.years_count} yoshga to‘ladi`
                            : `${item.years_count}-yilligi`}
                        </span>
                      )}
                    </div>

                    <span
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-xs font-bold',
                        isToday
                          ? 'bg-pink-600 text-white animate-pulse'
                          : 'bg-zinc-800 text-zinc-300'
                      )}
                    >
                      {item.days_until === 0
                        ? 'Bugun!'
                        : `${item.days_until} kun qoldi`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative w-full max-w-md bg-[#121217] border border-white/10 rounded-3xl p-6 z-10 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-4">
                {editingId ? 'Sanani tahrirlash' : 'Yangi muhim sana qo‘shish'}
              </h3>

              <form onSubmit={handleSaveDate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Sana nomi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Onamning tavallud kuni"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Sana turi
                    </label>
                    <select
                      value={dateType}
                      onChange={(e) => setDateType(e.target.value as ImportantDateType)}
                      className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      {DATE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Sana (kun/oy/yil)
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-[#18181f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Izoh (ixtiyoriy)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Qo‘shimcha eslatma yoki tabrik so‘zlari..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={repeatYearly}
                      onChange={(e) => setRepeatYearly(e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 bg-zinc-800 border-white/20"
                    />
                    <span>Har yili avtomatik takrorlansin</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 bg-zinc-800 border-white/20"
                    />
                    <span>Eslatma va bildirishnoma yuborilsin</span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2">
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
