import { getStore } from '@netlify/blobs';
import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';
import { jsonResponse, originAllowed } from './_hotline-http.mjs';

const base = () => String(process.env.SUPABASE_URL || 'https://dowfjjthshbbgnvwxzjv.supabase.co').replace(/\/$/, '');
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const auth = request => verifyAdminToken(getBearerToken(request), process.env.HOTLINE_ADMIN_SECRET);
const headers = () => ({
  apikey: key(),
  authorization: `Bearer ${key()}`,
  'content-type': 'application/json',
});

export default async request => {
  if (!originAllowed(request)) return jsonResponse(403, { ok: false, message: 'Origin not allowed.' });
  if (!auth(request)) return jsonResponse(401, { ok: false, message: 'Admin session expired.' });
  if (request.method !== 'GET') return jsonResponse(405, { ok: false, message: 'Method not allowed.' });

  const id = String(new URL(request.url).searchParams.get('id') || '').trim().slice(0, 80);
  if (!id) return jsonResponse(400, { ok: false, message: 'Entry ID is required.' });
  if (!key()) return jsonResponse(500, { ok: false, message: 'Photo service is not configured.' });

  try {
    const response = await fetch(
      `${base()}/rest/v1/contest_entries?id=eq.${encodeURIComponent(id)}&photo_asset_key=not.is.null&select=photo_asset_key,photo_mime&limit=1`,
      { headers: headers() },
    );
    if (!response.ok) throw new Error('Photo record could not be loaded.');
    const rows = await response.json();
    const entry = rows?.[0];
    if (!entry?.photo_asset_key) return new Response('Photo not found.', { status: 404 });

    const data = await getStore('contest-entry-photos', { consistency: 'strong' })
      .get(entry.photo_asset_key, { type: 'arrayBuffer' });
    if (!data) return new Response('Photo not found.', { status: 404 });

    return new Response(data, {
      status: 200,
      headers: {
        'content-type': entry.photo_mime || 'image/webp',
        'cache-control': 'private, no-store, max-age=0',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('contest-admin-photo', error);
    return jsonResponse(500, { ok: false, message: 'The photo preview could not be loaded.' });
  }
};

export const config = { path: '/api/contest-admin-photo' };
