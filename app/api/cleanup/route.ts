import { adminDb } from '@/lib/firebaseAdmin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const expected = process.env.CLEANUP_TOKEN;

  if (!expected || token !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRole) {
    return new Response('Missing Supabase service role config', { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const expiredSnap = await adminDb
    .collectionGroup('orders')
    .where('expiresAt', '<=', now)
    .get();

  const batch = adminDb.batch();
  const filePaths: string[] = [];

  expiredSnap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const filePath = data.filePath;
    if (filePath) filePaths.push(filePath);

    batch.delete(docSnap.ref);
  });

  const chunkSize = 100;
  for (let i = 0; i < filePaths.length; i += chunkSize) {
    const chunk = filePaths.slice(i, i + chunkSize);
    await supabaseAdmin.storage.from('xerox-files').remove(chunk);
  }
  await batch.commit();

  return Response.json({ deleted: expiredSnap.size });
}
