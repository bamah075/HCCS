import { NextResponse } from 'next/server';
import { requireAdmin } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

export async function POST() {
    const { error: __authError } = await requireAdmin();
    if (__authError) return __authError;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('compliance_scan')
    .update({ qr: null })
    .not('qr', 'is', null)
    .select('id');

  if (error) {
    return NextResponse.json({ status: false, message: error.message });
  }

  return NextResponse.json({
    status: true,
    data: {
      updated_count: Array.isArray(data) ? data.length : 0,
    },
  });
}
