import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o‘tilmagan' }, { status: 401 });
    }

    const letterId = params.id;

    // Fetch letter
    const { data: letter, error: fetchErr } = await supabase
      .from('future_letters')
      .select('*')
      .eq('id', letterId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !letter) {
      return NextResponse.json({ error: 'Xat topilmadi' }, { status: 404 });
    }

    // STRICT CHECK: Is current server time >= unlock_at?
    const now = Date.now();
    const unlockTime = new Date(letter.unlock_at).getTime();

    if (now < unlockTime) {
      return NextResponse.json(
        {
          error: 'Xatni ochish vaqti hali yetib kelmadi! Server xatni ochishga ruxsat bermaydi.',
          unlock_at: letter.unlock_at,
        },
        { status: 403 }
      );
    }

    // Mark as opened
    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from('future_letters')
      .update({
        status: 'opened',
        opened_at: letter.opened_at || nowIso,
      })
      .eq('id', letterId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, letter: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
