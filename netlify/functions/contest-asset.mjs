import { getStore } from '@netlify/blobs';

function assetStore() {
  return getStore('contest-assets', { consistency: 'strong' });
}

function keyFromRequest(request) {
  const pathname = new URL(request.url).pathname;
  const prefix = '/api/contest-assets/';
  if (!pathname.startsWith(prefix)) return '';
  const raw = pathname.slice(prefix.length).replace(/^\/+|\/+$/g, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function contentTypeFor(key, metadata = {}) {
  if (metadata.contentType) return metadata.contentType;
  const extension = key.split('.').pop()?.toLowerCase();
  return {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
  }[extension] || 'application/octet-stream';
}

export default async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const key = keyFromRequest(request);
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const item = await assetStore().getWithMetadata(key, { type: 'arrayBuffer' });
    if (!item?.data) return new Response('Not found', { status: 404 });

    const headers = {
      'content-type': contentTypeFor(key, item.metadata),
      'content-length': String(item.data.byteLength),
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    };

    return new Response(request.method === 'HEAD' ? null : item.data, { status: 200, headers });
  } catch (error) {
    console.error('Contest asset read failed', { key, message: error?.message });
    return new Response('Asset unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
};

export const config = {
  path: [
    '/api/contest-assets/:folder/:file',
    '/api/contest-assets/:file',
  ],
};
