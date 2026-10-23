'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, BookOpen, CalendarHeart, Bell, ArrowRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatUzbekDate } from '@/lib/utils/dates';

interface SearchResult {
  id: string;
  title: string;
  type: 'memory' | 'diary' | 'date' | 'reminder';
  date: string;
  preview: string;
  href: string;
}

export default function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function performSearch(searchTerm: string) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const resultsList: SearchResult[] = [];

      // Search memories
      const { data: memories } = await supabase
        .from('memories')
        .select('id, title, body, event_date')
        .eq('user_id', user.id)
        .or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`)
        .limit(5);

      if (memories) {
        memories.forEach((m) => {
          resultsList.push({
            id: m.id,
            title: m.title || 'Sarlavhasiz xotira',
            type: 'memory',
            date: m.event_date,
            preview: m.body ? m.body.slice(0, 100) : '',
            href: `/memories/${m.id}`,
          });
        });
      }

      // Search diary
      const { data: diary } = await supabase
        .from('diary_entries')
        .select('id, title, body, entry_date')
        .eq('user_id', user.id)
        .or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`)
        .limit(5);

      if (diary) {
        diary.forEach((d) => {
          resultsList.push({
            id: d.id,
            title: d.title || 'Kundalik yozuvi',
            type: 'diary',
            date: d.entry_date,
            preview: d.body ? d.body.slice(0, 100) : '',
            href: `/diary?highlight=${d.id}`,
          });
        });
      }

      // Search dates
      const { data: dates } = await supabase
        .from('important_dates')
        .select('id, title, description, event_date')
        .eq('user_id', user.id)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(5);

      if (dates) {
        dates.forEach((d) => {
          resultsList.push({
            id: d.id,
            title: d.title,
            type: 'date',
            date: d.event_date,
            preview: d.description || '',
            href: `/important-dates?highlight=${d.id}`,
          });
        });
      }

      setResults(resultsList);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#121217] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-white/10">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Xotiralar, kundalik, sanalar bo‘yicha qidirish..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-0 px-4 py-4 text-white placeholder-zinc-500 focus:outline-none text-base"
          />
          {loading ? (
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-zinc-400 bg-zinc-800 rounded border border-white/5">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Box */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {!query.trim() && (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Qidirish uchun biron narsa yozing...
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="py-12 text-center text-zinc-500 text-sm">
              &quot;{query}&quot; bo‘yicha hech narsa topilmadi
            </div>
          )}

          {results.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => {
                router.push(item.href);
                onClose();
              }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-zinc-800/80 group-hover:bg-violet-600/20 text-zinc-300 group-hover:text-violet-400 transition-colors mt-0.5">
                  {item.type === 'memory' && <Clock className="w-4 h-4" />}
                  {item.type === 'diary' && <BookOpen className="w-4 h-4" />}
                  {item.type === 'date' && <CalendarHeart className="w-4 h-4" />}
                  {item.type === 'reminder' && <Bell className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                      {item.type === 'memory' && 'Xotira'}
                      {item.type === 'diary' && 'Kundalik'}
                      {item.type === 'date' && 'Sana'}
                      {item.type === 'reminder' && 'Eslatma'}
                    </span>
                  </div>
                  {item.preview && (
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{item.preview}</p>
                  )}
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    {formatUzbekDate(item.date)}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-all transform group-hover:translate-x-1 shrink-0 ml-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
