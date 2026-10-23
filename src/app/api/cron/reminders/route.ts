import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Server scheduler endpoint for executing due reminders & important dates
 * Can be called by Vercel Cron or Supabase pg_cron or external trigger
 * Protected with CRON_SECRET or service role authorization
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const supabase = getAdminClient();
    const nowIso = new Date().toISOString();
    const todayDateStr = nowIso.split('T')[0];

    let processedCount = 0;

    // 1. Process active reminders whose scheduled_at <= now and not sent today
    const { data: dueReminders, error: remError } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_active', true)
      .lte('scheduled_at', nowIso);

    if (dueReminders) {
      for (const rem of dueReminders) {
        const dedupKey = `rem_${rem.id}_${todayDateStr}`;

        // Insert in-app notification with deduplication key
        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: rem.user_id,
          title: `Eslatma: ${rem.title}`,
          body: rem.description || 'Belgilangan vaqt yetib keldi',
          notification_type: 'reminder',
          scheduled_at: nowIso,
          sent_at: nowIso,
          status: 'sent',
          deduplication_key: dedupKey,
        });

        if (!notifErr) {
          processedCount++;
        }

        // Handle recurrence
        if (rem.recurrence_rule !== 'none') {
          const currentSched = new Date(rem.scheduled_at);
          let nextSched = new Date(currentSched);

          if (rem.recurrence_rule === 'daily') {
            nextSched.setDate(nextSched.getDate() + 1);
          } else if (rem.recurrence_rule === 'weekly') {
            nextSched.setDate(nextSched.getDate() + 7);
          } else if (rem.recurrence_rule === 'monthly') {
            nextSched.setMonth(nextSched.getMonth() + 1);
          } else if (rem.recurrence_rule === 'yearly') {
            nextSched.setFullYear(nextSched.getFullYear() + 1);
          }

          await supabase
            .from('reminders')
            .update({
              scheduled_at: nextSched.toISOString(),
              last_sent_at: nowIso,
              next_run_at: nextSched.toISOString(),
            })
            .eq('id', rem.id);
        } else {
          // One-time reminder marked inactive once executed
          await supabase
            .from('reminders')
            .update({
              is_active: false,
              last_sent_at: nowIso,
            })
            .eq('id', rem.id);
        }
      }
    }

    // 2. Process Birthday & Important Date reminders for today
    const parts = todayDateStr.split('-');
    const currentMonth = parts[1];
    const currentDay = parts[2];

    const { data: allDates } = await supabase
      .from('important_dates')
      .select('*')
      .eq('reminder_enabled', true);

    if (allDates) {
      for (const d of allDates) {
        const dParts = d.event_date.split('-');
        if (dParts[1] === currentMonth && dParts[2] === currentDay) {
          const dedupKey = `date_${d.id}_${todayDateStr}`;
          const isBday = d.date_type === 'birthday';

          await supabase.from('notifications').insert({
            user_id: d.user_id,
            title: isBday ? `Tug‘ilgan kun: ${d.title}!` : `Muhim sana: ${d.title}`,
            body: d.description || (isBday ? 'Bugun yaqiningizning tavallud kuni!' : 'Bugun muhim sana nishonlanmoqda'),
            notification_type: isBday ? 'birthday' : 'anniversary',
            scheduled_at: nowIso,
            sent_at: nowIso,
            status: 'sent',
            deduplication_key: dedupKey,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
