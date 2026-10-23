'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  ArrowLeft,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { Memory } from '@/lib/supabase/types';
import { formatUzbekDate } from '@/lib/utils/dates';

export default function ArchivePage() {
  const [archivedMemories, setArchivedMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadArchive();
  }, []);

  async function loadArchive() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', true)
        .order('event_date', { ascending: false });

      if (!error && data) {
        setArchivedMemories(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(memoryId: string) {
    setActionLoading(memoryId);
    try {
      await supabase.from('memories').update({ is_archived: false }).eq('id', memoryId);
      setArchivedMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePermanentDelete(memoryId: string) {
    if (!confirm('Ushbu xotirani butunlay o‘chirib yuborishni tasdiqlaysizmi?')) return;
    setActionLoading(memoryId);
    try {
      await supabase.from('memories').delete().eq('id', memoryId);
      setArchivedMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-amber-400" />
            <span>Arxivlangan Xotiralar</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Asosiy ro‘yxatdan yashirilgan, lekin xavfsiz saqlanayotgan xotiralar
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-zinc-900/40 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : archivedMemories.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/10">
            <Archive className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Arxiv bo‘sh</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Hozirda arxivlangan xotiralar mavjud emas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedMemories.map((mem) => (
              <div
                key={mem.id}
                className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span>{formatUzbekDate(mem.event_date)}</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] font-semibold">
                      Arxivda
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 line-clamp-1">
                    {mem.title || 'Sarlavhasiz xotira'}
                  </h3>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                    {mem.body || 'Matn kiritilmagan'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => handleRestore(mem.id)}
                    disabled={actionLoading === mem.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Qayta tiklash</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(mem.id)}
                    disabled={actionLoading === mem.id}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Butunlay o‘chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
