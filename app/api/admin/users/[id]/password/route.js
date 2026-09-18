import { NextResponse } from 'next/server';
import { requireWritableSuperadmin } from '../../../../../../src/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function PUT(request, context) {
  try {
    const auth = await requireWritableSuperadmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const body = await request.json();
    const password = String(body?.password || '');

    if (!id || password.length < 8) {
      return NextResponse.json(
        { error: 'ID pengguna dan password minimal 8 karakter wajib diisi.' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.admin.auth.admin.updateUserById(id, { password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error('Gagal mereset password pengguna:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
