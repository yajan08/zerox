import { createClient } from '@supabase/supabase-js';
import { adminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    return new Response('Firebase Admin not configured', { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const idToken = authHeader.replace('Bearer ', '');
  try {
    await adminAuth.verifyIdToken(idToken);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRole) {
    return new Response('Missing Supabase service role config', { status: 500 });
  }

  const body = await request.json();
  const filePath = body?.filePath;
  if (!filePath || typeof filePath !== 'string') {
    return new Response('Invalid request', { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false },
  });

  const { error } = await supabaseAdmin.storage
    .from('xerox-files')
    .remove([filePath]);

  if (error) {
    const msg = error.message || 'Delete failed';
    if (/not found/i.test(msg)) {
      return Response.json({ ok: true, missing: true });
    }
    return new Response(msg, { status: 400 });
  }

  return Response.json({ ok: true });
}
