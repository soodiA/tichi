// Resolves an option's imageUrl to something an <img> tag can load.
// Absolute URLs (http/data:) pass through unchanged. A path stored as "/foo.svg"
// is relative to the app's public/ root, which is NOT the same as the browser's
// domain root once deployed under a base path (e.g. /tichi/ or /tichi/demo/) —
// so it must be re-prefixed with Vite's configured BASE_URL at render time.
export const isImagePath = (s: string) => s.startsWith('http') || s.startsWith('/') || s.startsWith('data:');

export const resolveImageSrc = (img: string): string => {
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  return import.meta.env.BASE_URL + img.replace(/^\//, '');
};
