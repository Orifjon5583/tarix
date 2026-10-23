'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, CalendarHeart, Clock, Send, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AppNotification } from '@/lib/supabase/types';
import { formatUzbekDate } from '@/lib/utils/dates';
import clsx from 'clsx';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        const unread = data.filter((n) => !n.read_at).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }

  async function markAllAsRead() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      await supabase
        .from('notifications')
        .update({ read_at: now, status: 'read' })
        .eq('user_id', user.id)
        .is('read_at', null);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || now, status: 'read' }))
      );
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'birthday':
      case 'anniversary':
        return <CalendarHeart className="w-4 h-4 text-pink-400" />;
      case 'future_letter':
        return <Send className="w-4 h-4 text-violet-400" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/5"
        aria-label="Bildirishnomalar"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shadow-glow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-[#121217] border border-white/10 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-violet-400" />
                <h4 className="text-sm font-semibold text-white">Bildirishnomalar</h4>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Barchasini o‘qilgan qilish
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Hozircha hech qanday bildirishnoma yo‘q
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={clsx(
                      'p-3 rounded-xl border transition-all text-xs flex gap-3 items-start',
                      item.read_at
                        ? 'bg-zinc-900/30 border-white/5 text-zinc-400'
                        : 'bg-violet-950/20 border-violet-500/20 text-zinc-200'
                    )}
                  >
                    <div className="p-2 rounded-lg bg-white/5 shrink-0 mt-0.5">
                      {getNotificationIcon(item.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-zinc-100 truncate">{item.title}</p>
                        {!item.read_at && (
                          <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-zinc-400 mt-0.5 line-clamp-2">{item.body}</p>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        {formatUzbekDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
