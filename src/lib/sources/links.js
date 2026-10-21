// "Paste a link": Wikipedia articles, Google Sheets, GitHub files, Our World in Data
// charts, and any direct CSV/JSON/Excel/Parquet URL that allows browser access.
import { htmlTableToData } from '../parse.js';

export function normaliseUrl(input) {
  let u;
  try { u = new URL(String(input).trim()); } catch { throw new Error('That does not look like a link. It should start with https://'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) links are supported.');
  const host = u.hostname.replace(/^www\./, '');

  const wiki = host.match(/^([a-z-]+)\.(?:m\.)?wikipedia\.org$/);
  if (wiki && u.pathname.startsWith('/wiki/')) {
    const title = decodeURIComponent(u.pathname.slice(6));
    return {
      kind: 'wikipedia', label: `Wikipedia: ${title.replace(/_/g, ' ')}`, original: u.href,
      fetchUrl: `https://${wiki[1]}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&formatversion=2&redirects=1&origin=*`,
    };
  }
  const sheet = u.href.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
  if (sheet) {
    const gid = u.hash.match(/gid=(\d+)/)?.[1] || u.searchParams.get('gid') || '0';
    return {
      kind: 'gsheet', label: 'Google Sheet', original: u.href, ext: 'csv',
      fetchUrl: `https://docs.google.com/spreadsheets/d/${sheet[1]}/gviz/tq?tqx=out:csv&gid=${gid}`,
    };
  }
  if (host === 'github.com') {
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/);
    if (m) {
      const path = m[3];
      return { kind: 'file', label: `GitHub: ${path.split('/').pop()}`, original: u.href, ext: extOf(path), fetchUrl: `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${path}` };
    }
  }
  if (host === 'ourworldindata.org') {
    const m = u.pathname.match(/^\/grapher\/([\w-]+)/);
    if (m) return { kind: 'file', label: `Our World in Data: ${m[1].replace(/-/g, ' ')}`, original: u.href, ext: 'csv', fetchUrl: `https://ourworldindata.org/grapher/${m[1]}.csv?v=1&csvType=full&useColumnShortNames=false` };
  }
  return { kind: 'file', label: host + u.pathname.replace(/\/$/, ''), original: u.href, ext: extOf(u.pathname), fetchUrl: u.href };
}

function extOf(path) {
  const m = String(path).toLowerCase().match(/\.(csv|tsv|txt|json|ndjson|parquet|xlsx|xls|ods)(?:$|\?)/);
  return m ? m[1] : '';
}

async function get(url) {
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch {
    const err = new Error("That site doesn't allow browser apps to read its data (or it's unreachable). Download the file and drop it here instead — it never leaves your device.");
    err.cors = true;
    throw err;
  }
  if (!res.ok) throw new Error(`The link returned ${res.status} ${res.statusText || ''}. Is it public?`.trim());
  return res;
}

// Returns either { tables: [{caption, data}] } for HTML pages or { buffer, ext } for files.
export async function fetchLink(info) {
  const res = await get(info.fetchUrl);
  if (info.kind === 'wikipedia') {
    const json = await res.json();
    if (json.error) throw new Error(`Wikipedia: ${json.error.info}`);
    return { tables: extractTables(json.parse.text) };
  }
  const type = res.headers.get('content-type') || '';
  const buf = new Uint8Array(await res.arrayBuffer());
  if (info.kind === 'gsheet' && /text\/html/.test(type)) throw new Error('That Google Sheet is private. Set sharing to “Anyone with the link can view”, or use File → Share → Publish to web.');
  let ext = info.ext;
  if (!ext) {
    if (/json/.test(type)) ext = 'json';
    else if (/csv|tab-separated|text\/plain/.test(type)) ext = 'csv';
    else if (/spreadsheet|excel/.test(type)) ext = 'xlsx';
    else if (/parquet/.test(type)) ext = 'parquet';
    else if (/html/.test(type)) return { tables: extractTables(new TextDecoder().decode(buf)) };
    else ext = 'csv';
  }
  return { buffer: buf, ext };
}

export function extractTables(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];
  doc.querySelectorAll('table').forEach((t) => {
    if (t.closest('table') !== t && t.parentElement?.closest('table')) return; // skip nested
    if (/\b(infobox|navbox|metadata|sidebar|vertical-navbox|ambox|mbox)\b/.test(t.className)) return;
    try {
      const caption = t.querySelector('caption')?.textContent.trim() || prevHeading(t);
      const data = htmlTableToData(t.cloneNode(true));
      if (data.rows.length >= 3 && data.headers.length >= 2) out.push({ caption, data });
    } catch { /* skip malformed table */ }
  });
  if (!out.length) throw new Error('No data tables found on that page.');
  return out;
}

function prevHeading(el) {
  let n = el;
  for (let i = 0; i < 30 && n; i++) {
    n = n.previousElementSibling || n.parentElement;
    if (n && /^H[2-4]$/.test(n.tagName)) return n.textContent.replace(/\[edit\]/g, '').trim();
    const h = n?.querySelector?.('h2, h3, h4');
    if (h && n !== el.parentElement) return h.textContent.replace(/\[edit\]/g, '').trim();
  }
  return '';
}
