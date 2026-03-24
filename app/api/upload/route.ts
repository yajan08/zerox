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

  const formData = await request.formData();
  const file = formData.get('file');
  const filePath = formData.get('filePath');

  if (!file || typeof filePath !== 'string') {
    return new Response('Invalid upload payload', { status: 400 });
  }

  if (!(file instanceof File)) {
    return new Response('File is required', { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false },
  });

  const { error: uploadError } = await supabaseAdmin.storage
    .from('xerox-files')
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return new Response(uploadError.message, { status: 400 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('xerox-files')
    .getPublicUrl(filePath);

  return Response.json({
    path: filePath,
    publicUrl: publicUrlData.publicUrl,
  });
}
