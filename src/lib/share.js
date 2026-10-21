// Dashboards are shared by encoding their recipe (source + edits) in the URL,
// so links work with no database. Recipients re-run the queries live.
import LZString from 'lz-string';

export function encodeShare(payload) {
  return LZString.compressToEncodedURIComponent(JSON.stringify({ v: 1, ...payload }));
}

export function decodeShare(code) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(code);
    const obj = json && JSON.parse(json);
    if (!obj || obj.v !== 1 || !obj.source) return null;
    return obj;
  } catch {
    return null;
  }
}

export function isShareable(source) {
  return source && ['worldbank', 'sample', 'link', 'paste'].includes(source.type);
}
