'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  CalendarHeart,
  Send,
  Bell,
  Plus,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Memory, DiaryEntry, ImportantDate, Reminder, FutureLetter } from '@/lib/supabase/types';
import {
  formatUzbekDate,
  formatUzbekDayMonth,
  UZ_MONTHS,
  UZ_WEEKDAYS,
  calculateNextOccurrence,
} from '@/lib/utils/dates';
import clsx from 'clsx';

interface DayItem {
  type: 'memory' | 'diary' | 'date' | 'reminder' | 'letter';
  id: string;
  title: string;
  href: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [dayItems, setDayItems] = useState<DayItem[]>([]);
  const [itemsByDate, setItemsByDate] = useState<Record<string, DayItem[]>>({});
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadAllEvents();
  }, [currentDate]);

  async function loadAllEvents() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [memRes, diaryRes, dateRes, remRes, letterRes] = await Promise.all([
        supabase.from('memories').select('id, title, event_date').eq('user_id', user.id).eq('is_archived', false),
        supabase.from('diary_entries').select('id, title, entry_date').eq('user_id', user.id).eq('is_archived', false),
        supabase.from('important_dates').select('id, title, event_date, repeat_yearly').eq('user_id', user.id),
        supabase.from('reminders').select('id, title, scheduled_at').eq('user_id', user.id).eq('is_active', true),
        supabase.from('future_letters').select('id, title, unlock_at').eq('user_id', user.id),
      ]);

      const map: Record<string, DayItem[]> = {};

      const addItem = (dateKey: string, item: DayItem) => {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(item);
      };

      if (memRes.data) {
        memRes.data.forEach((m) => {
          addItem(m.event_date, {
            type: 'memory',
            id: m.id,
            title: m.title || 'Xotira',
            href: `/memories/${m.id}`,
          });
        });
      }

      if (diaryRes.data) {
        diaryRes.data.forEach((d) => {
          addItem(d.entry_date, {
            type: 'diary',
            id: d.id,
            title: d.title || 'Kundalik yozuvi',
            href: `/diary`,
          });
        });
      }

      if (dateRes.data) {
        dateRes.data.forEach((d) => {
          // If repeat yearly, compute for the current year
          const parts = d.event_date.split('-');
          if (parts.length === 3) {
            const thisYearKey = `${currentDate.getFullYear()}-${parts[1]}-${parts[2]}`;
            addItem(thisYearKey, {
              type: 'date',
              id: d.id,
              title: d.title,
              href: `/important-dates`,
            });
          }
        });
      }

      if (remRes.data) {
        remRes.data.forEach((r) => {
          const dateKey = r.scheduled_at.split('T')[0];
          addItem(dateKey, {
            type: 'reminder',
            id: r.id,
            title: r.title,
            href: `/reminders`,
          });
        });
      }

      if (letterRes.data) {
        letterRes.data.forEach((l) => {
          const dateKey = l.unlock_at.split('T')[0];
          addItem(dateKey, {
            type: 'letter',
            id: l.id,
            title: l.title,
            href: `/letters`,
          });
        });
      }

      setItemsByDate(map);
    } catch (err) {
      console.error('Error loading calendar items:', err);
    } finally {
      setLoading(false);
    }
  }

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar matrix calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Convert Sunday=0 to Monday=0 (European/Uzbek standard: Mon=0, Sun=6)
  const startingCol = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const totalCells = Math.ceil((startingCol + daysInMonth) / 7) * 7;
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setDayItems(itemsByDate[dateStr] || []);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-violet-400" />
              <span>Kalendar</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Barcha xotiralar va muhim sanalaringiz vaqt o‘qi bo‘yicha
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3.5 py-2 rounded-xl bg-[#121217] border border-white/10 text-xs text-zinc-300 hover:text-white font-semibold transition-all"
            >
              Bugun
            </button>

            <div className="flex items-center bg-[#121217] border border-white/10 rounded-xl p-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Oldingi oy"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-bold text-white min-w-[140px] text-center">
                {UZ_MONTHS[month].toUpperCase()} {year}
              </span>

              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Keyingi oy"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 bg-[#101014] p-3 rounded-2xl border border-white/5">
          <span className="font-semibold text-zinc-300">Belgilar:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa]" />
            Xotiralar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
            Kundalik
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_6px_#f472b6]" />
            Muhim sanalar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
            Eslatmalar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            Kelajak xati
          </span>
        </div>

        {/* Month Calendar Grid */}
        <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-3 border-b border-white/5 mb-2">
            {['Du', 'Se', 'Chor', 'Pay', 'Ju', 'Shan', 'Yak'].map((dayName, idx) => (
              <div
                key={dayName}
                className={clsx(
                  'text-xs font-bold py-1',
                  idx >= 5 ? 'text-violet-400/80' : 'text-zinc-400'
                )}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: totalCells }).map((_, index) => {
              const dayNumber = index - startingCol + 1;
              const isCurrentMonthDay = dayNumber > 0 && dayNumber <= daysInMonth;

              if (!isCurrentMonthDay) {
                return (
                  <div
                    key={index}
                    className="min-h-[70px] sm:min-h-[90px] rounded-2xl bg-zinc-950/20 opacity-20 border border-transparent"
                  />
                );
              }

              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
              const isToday = dateKey === todayDateStr;
              const isSelected = dateKey === selectedDateStr;
              const items = itemsByDate[dateKey] || [];

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(dateKey)}
                  className={clsx(
                    'min-h-[70px] sm:min-h-[95px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group',
                    isToday
                      ? 'bg-violet-600/10 border-violet-500/50 shadow-glow-sm'
                      : isSelected
                      ? 'bg-white/10 border-white/30'
                      : 'bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        'text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center',
                        isToday
                          ? 'bg-violet-600 text-white shadow-glow-sm'
                          : 'text-zinc-300 group-hover:text-white'
                      )}
                    >
                      {dayNumber}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {items.length}
                      </span>
                    )}
                  </div>

                  {/* Badges / Dots */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {items.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className={clsx(
                          'w-2 h-2 rounded-full',
                          item.type === 'memory' && 'bg-violet-400',
                          item.type === 'diary' && 'bg-blue-400',
                          item.type === 'date' && 'bg-pink-400',
                          item.type === 'reminder' && 'bg-amber-400',
                          item.type === 'letter' && 'bg-emerald-400'
                        )}
                        title={item.title}
                      />
                    ))}
                    {items.length > 3 && (
                      <span className="text-[9px] text-zinc-500 font-bold">
                        +{items.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Modal or Panel */}
        {selectedDateStr && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {formatUzbekDate(selectedDateStr)}
                </h3>
                <p className="text-xs text-zinc-400">
                  {dayItems.length === 0
                    ? 'Ushbu kunga hech qanday voqea biriktirilmagan'
                    : `Jami ${dayItems.length} ta voqea mavjud`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/memories/new`}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Xotira qo‘shish</span>
                </Link>
                <button
                  onClick={() => setSelectedDateStr(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {dayItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {dayItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-violet-500/40 flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={clsx(
                          'p-2 rounded-lg shrink-0',
                          item.type === 'memory' && 'bg-violet-600/20 text-violet-400',
                          item.type === 'diary' && 'bg-blue-600/20 text-blue-400',
                          item.type === 'date' && 'bg-pink-600/20 text-pink-400',
                          item.type === 'reminder' && 'bg-amber-600/20 text-amber-400',
                          item.type === 'letter' && 'bg-emerald-600/20 text-emerald-400'
                        )}
                      >
                        {item.type === 'memory' && <Clock className="w-4 h-4" />}
                        {item.type === 'diary' && <BookOpen className="w-4 h-4" />}
                        {item.type === 'date' && <CalendarHeart className="w-4 h-4" />}
                        {item.type === 'reminder' && <Bell className="w-4 h-4" />}
                        {item.type === 'letter' && <Send className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white group-hover:text-violet-300 truncate">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-zinc-400 capitalize">
                          {item.type === 'memory' && 'Xotira'}
                          {item.type === 'diary' && 'Kundalik'}
                          {item.type === 'date' && 'Muhim sana'}
                          {item.type === 'reminder' && 'Eslatma'}
                          {item.type === 'letter' && 'Kelajak xati'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
