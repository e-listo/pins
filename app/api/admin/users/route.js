import { NextResponse } from 'next/server';
import { requireWritableSuperadmin } from '../../../../src/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const auth = await requireWritableSuperadmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const nip = String(body?.nip || '').trim();
    const password = String(body?.password || '');
    const nama = String(body?.nama || '').trim();

    if (!nip || !nama || password.length < 8) {
      return NextResponse.json(
        { error: 'NIP, nama, dan password minimal 8 karakter wajib diisi.' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.admin.auth.admin.createUser({
      email: `${nip}@pupkp.local`,
      password,
      email_confirm: true,
      user_metadata: { nip, nama },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 });
    }

    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat pengguna Auth:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
