/*
 * The clip worker. Safari plays a video only from byte ranges: it asks for "bytes=0-1", then for the parts it
 * needs. A host that answers with the whole file instead (compressed, without a length) leaves Safari with a
 * broken player. This worker stands between the page and such a host: it fetches a clip whole, once, and
 * answers every range request for it with that part of the file.
 *
 * The page turns it on only after a clip has failed to load (src/scripts/clip-rescue.ts). It touches nothing
 * but range requests for /media/*.mp4.
 */
const whole = new Map();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const range = request.headers.get('range');
  const url = new URL(request.url);
  if (request.method !== 'GET' || !range || url.origin !== self.location.origin || !/^\/media\/[^/]+\.mp4$/.test(url.pathname)) return;
  event.respondWith(part(url.href, range));
});

/** The whole clip, fetched once for as long as the worker lives; the browser's own cache covers the rest. */
function clip(url) {
  let file = whole.get(url);
  if (!file) {
    file = fetch(url).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.blob();
    });
    file.catch(() => whole.delete(url));
    whole.set(url, file);
  }
  return file;
}

async function part(url, range) {
  let file;
  try {
    file = await clip(url);
  } catch {
    return Response.error();
  }
  const size = file.size;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = match && match[1] ? Number(match[1]) : NaN;
  let end = match && match[2] ? Number(match[2]) : size - 1;
  // "bytes=-8" is the last eight bytes.
  if (match && !match[1] && match[2]) {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  if (!match || Number.isNaN(start) || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(file.slice(start, end + 1, 'video/mp4'), {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}
