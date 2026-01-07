import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const { start, end } = monthRange(month);

    const sb = supabaseAdmin();

    const q = sb
      .from('checadas')
      .select('pin,device_ip,timestamp_utc')
      .gte('timestamp_utc', start)
      .lt('timestamp_utc', end)
      .order('timestamp_utc', { ascending: true })
      .limit(10000);

    const { data, error } = await q;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ month, count: data?.length ?? 0, checadas: data ?? [] });
  } catch (e: any) {
    console.error('Route crash:', e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
