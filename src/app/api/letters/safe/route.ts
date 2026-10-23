import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o‘tilmagan' }, { status: 401 });
    }

    // Call secure DB function or query with redaction
    const nowIso = new Date().toISOString();

    const { data: letters, error } = await supabase
      .from('future_letters')
      .select('id, user_id, title, body, unlock_at, timezone, status, opened_at, reminder_enabled, created_at, updated_at')
      .eq('user_id', user.id)
      .order('unlock_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // STRICT SERVER-SIDE REDACTION:
    // If unlock_at > now, redact the body to NULL so no client devtools/inspection can peek!
    const sanitizedLetters = letters.map((l) => {
      const isUnlocked = new Date(l.unlock_at).getTime() <= Date.now();
      return {
        ...l,
        body: isUnlocked ? l.body : null,
        is_unlocked: isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : l.opened_at
          ? 'opened'
          : 'ready',
      };
    });

    return NextResponse.json({ letters: sanitizedLetters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
