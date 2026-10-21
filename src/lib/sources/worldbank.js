// World Bank Open Data (api.worldbank.org) — free, no key, browser-accessible.

export const TOPICS = {
  economy: ['NY.GDP.MKTP.KD.ZG', 'NY.GDP.PCAP.CD', 'FP.CPI.TOTL.ZG', 'SL.UEM.TOTL.ZS'],
  trade: ['NE.EXP.GNFS.ZS', 'NE.IMP.GNFS.ZS', 'BX.KLT.DINV.CD.WD'],
  health: ['SP.DYN.LE00.IN', 'SP.DYN.IMRT.IN', 'SH.XPD.CHEX.GD.ZS'],
  climate: ['EN.GHG.CO2.PC.CE.AR5', 'EG.FEC.RNEW.ZS', 'AG.LND.FRST.ZS'],
  energy: ['EG.ELC.ACCS.ZS', 'EG.FEC.RNEW.ZS', 'EN.GHG.CO2.PC.CE.AR5'],
  digital: ['IT.NET.USER.ZS', 'IT.CEL.SETS.P2'],
  education: ['SE.XPD.TOTL.GD.ZS', 'SE.PRM.ENRR', 'SE.TER.ENRR'],
  population: ['SP.POP.TOTL', 'SP.URB.TOTL.IN.ZS', 'SP.POP.65UP.TO.ZS', 'SP.DYN.TFRT.IN'],
  poverty: ['SI.POV.GINI', 'SI.POV.DDAY'],
  work: ['SL.UEM.TOTL.ZS', 'SL.TLF.CACT.FE.ZS', 'SL.UEM.1524.ZS'],
};

// label is the column name, so it is kept short and carries its unit.
export const INDICATORS = [
  { code: 'NY.GDP.MKTP.CD', label: 'GDP (US$)', format: 'currency', additive: true, topic: 'economy', kw: ['gdp', 'economy size', 'output', 'gross domestic product'] },
  { code: 'NY.GDP.PCAP.CD', label: 'GDP per capita (US$)', format: 'currency', topic: 'economy', kw: ['gdp per capita', 'per capita', 'income per person', 'average income', 'rich', 'wealth'] },
  { code: 'NY.GDP.MKTP.KD.ZG', label: 'GDP growth (%)', format: 'percent', topic: 'economy', kw: ['growth', 'gdp growth', 'grew', 'growing', 'fastest', 'economic growth'] },
  { code: 'FP.CPI.TOTL.ZG', label: 'Inflation (%)', format: 'percent', topic: 'economy', kw: ['inflation', 'prices', 'cpi', 'cost of living'] },
  { code: 'SL.UEM.TOTL.ZS', label: 'Unemployment (%)', format: 'percent', topic: 'work', kw: ['unemployment', 'jobless', 'jobs', 'employment'] },
  { code: 'SL.UEM.1524.ZS', label: 'Youth unemployment (%)', format: 'percent', topic: 'work', kw: ['youth unemployment', 'young people jobs'] },
  { code: 'SL.TLF.CACT.FE.ZS', label: 'Female labour participation (%)', format: 'percent', topic: 'work', kw: ['women', 'female', 'gender', 'labour force', 'labor force'] },
  { code: 'NE.EXP.GNFS.ZS', label: 'Exports (% of GDP)', format: 'percent', topic: 'trade', kw: ['exports', 'export', 'trade'] },
  { code: 'NE.IMP.GNFS.ZS', label: 'Imports (% of GDP)', format: 'percent', topic: 'trade', kw: ['imports', 'import', 'trade'] },
  { code: 'BX.KLT.DINV.CD.WD', label: 'FDI inflows (US$)', format: 'currency', additive: true, topic: 'trade', kw: ['fdi', 'foreign investment', 'investment inflows'] },
  { code: 'NV.IND.MANF.ZS', label: 'Manufacturing (% of GDP)', format: 'percent', topic: 'economy', kw: ['manufacturing', 'factories', 'industry'] },
  { code: 'NV.AGR.TOTL.ZS', label: 'Agriculture (% of GDP)', format: 'percent', topic: 'economy', kw: ['agriculture', 'farming'] },
  { code: 'NV.SRV.TOTL.ZS', label: 'Services (% of GDP)', format: 'percent', topic: 'economy', kw: ['services sector', 'services'] },
  { code: 'GC.DOD.TOTL.GD.ZS', label: 'Government debt (% of GDP)', format: 'percent', topic: 'economy', kw: ['debt', 'government debt', 'public debt'] },
  { code: 'MS.MIL.XPND.GD.ZS', label: 'Military spending (% of GDP)', format: 'percent', topic: 'economy', kw: ['military', 'defence', 'defense', 'army'] },
  { code: 'GB.XPD.RSDV.GD.ZS', label: 'R&D spending (% of GDP)', format: 'percent', topic: 'education', kw: ['r&d', 'research', 'innovation'] },
  { code: 'ST.INT.ARVL', label: 'Tourist arrivals', format: 'number', additive: true, topic: 'economy', kw: ['tourism', 'tourists', 'travel', 'visitors'] },
  { code: 'SP.POP.TOTL', label: 'Population', format: 'number', additive: true, topic: 'population', kw: ['population', 'people', 'populous', 'largest countries'] },
  { code: 'SP.URB.TOTL.IN.ZS', label: 'Urban population (%)', format: 'percent', topic: 'population', kw: ['urban', 'cities', 'urbanisation', 'urbanization'] },
  { code: 'SP.POP.65UP.TO.ZS', label: 'Population aged 65+ (%)', format: 'percent', topic: 'population', kw: ['ageing', 'aging', 'elderly', 'old age'] },
  { code: 'SP.DYN.TFRT.IN', label: 'Fertility rate (births per woman)', format: 'number', topic: 'population', kw: ['fertility', 'birth rate', 'births', 'children per woman'] },
  { code: 'EN.POP.DNST', label: 'Population density (per km²)', format: 'number', topic: 'population', kw: ['density', 'crowded'] },
  { code: 'SP.DYN.LE00.IN', label: 'Life expectancy (years)', format: 'number', topic: 'health', kw: ['life expectancy', 'longevity', 'live longer', 'lifespan', 'health'] },
  { code: 'SP.DYN.IMRT.IN', label: 'Infant mortality (per 1,000 births)', format: 'number', topic: 'health', kw: ['infant mortality', 'child mortality', 'baby deaths'] },
  { code: 'SH.XPD.CHEX.GD.ZS', label: 'Health spending (% of GDP)', format: 'percent', topic: 'health', kw: ['health spending', 'healthcare', 'health expenditure'] },
  { code: 'EN.GHG.CO2.PC.CE.AR5', label: 'CO₂ emissions per person (t)', format: 'number', topic: 'climate', kw: ['co2', 'carbon', 'emissions', 'climate', 'pollution', 'greenhouse'] },
  { code: 'EG.FEC.RNEW.ZS', label: 'Renewable energy share (%)', format: 'percent', topic: 'energy', kw: ['renewable', 'renewables', 'green energy', 'clean energy', 'solar', 'wind'] },
  { code: 'EG.ELC.ACCS.ZS', label: 'Access to electricity (%)', format: 'percent', topic: 'energy', kw: ['electricity', 'electrification', 'power access'] },
  { code: 'AG.LND.FRST.ZS', label: 'Forest area (%)', format: 'percent', topic: 'climate', kw: ['forest', 'forests', 'deforestation', 'trees'] },
  { code: 'IT.NET.USER.ZS', label: 'Internet users (%)', format: 'percent', topic: 'digital', kw: ['internet', 'online', 'digital', 'connectivity', 'tech'] },
  { code: 'IT.CEL.SETS.P2', label: 'Mobile subscriptions (per 100)', format: 'number', topic: 'digital', kw: ['mobile', 'phones', 'smartphone', 'cellular'] },
  { code: 'SE.XPD.TOTL.GD.ZS', label: 'Education spending (% of GDP)', format: 'percent', topic: 'education', kw: ['education spending', 'education', 'schools'] },
  { code: 'SE.PRM.ENRR', label: 'Primary school enrolment (%)', format: 'percent', topic: 'education', kw: ['primary school', 'enrolment', 'enrollment'] },
  { code: 'SE.TER.ENRR', label: 'University enrolment (%)', format: 'percent', topic: 'education', kw: ['university', 'college', 'higher education', 'tertiary'] },
  { code: 'SE.ADT.LITR.ZS', label: 'Adult literacy (%)', format: 'percent', topic: 'education', kw: ['literacy', 'literate', 'reading'] },
  { code: 'SI.POV.GINI', label: 'Gini index', format: 'number', topic: 'poverty', kw: ['inequality', 'gini', 'unequal'] },
  { code: 'SI.POV.DDAY', label: 'Extreme poverty (%)', format: 'percent', topic: 'poverty', kw: ['poverty', 'poor', 'extreme poverty'] },
];
export const INDICATOR_BY_CODE = Object.fromEntries(INDICATORS.map((i) => [i.code, i]));

export const COUNTRIES = [
  ['IND', 'India', ['india', 'indian', 'bharat']], ['CHN', 'China', ['china', 'chinese', 'prc']],
  ['USA', 'United States', ['united states', 'america', 'american', 'u.s.']], ['GBR', 'United Kingdom', ['united kingdom', 'uk', 'britain', 'british', 'england']],
  ['JPN', 'Japan', ['japan', 'japanese']], ['DEU', 'Germany', ['germany', 'german']], ['FRA', 'France', ['france', 'french']],
  ['ITA', 'Italy', ['italy', 'italian']], ['ESP', 'Spain', ['spain', 'spanish']], ['CAN', 'Canada', ['canada', 'canadian']],
  ['BRA', 'Brazil', ['brazil', 'brazilian']], ['RUS', 'Russia', ['russia', 'russian']], ['ZAF', 'South Africa', ['south africa', 'south african']],
  ['IDN', 'Indonesia', ['indonesia', 'indonesian']], ['PAK', 'Pakistan', ['pakistan', 'pakistani']], ['BGD', 'Bangladesh', ['bangladesh', 'bangladeshi']],
  ['NPL', 'Nepal', ['nepal', 'nepali', 'nepalese']], ['LKA', 'Sri Lanka', ['sri lanka', 'sri lankan']], ['BTN', 'Bhutan', ['bhutan']],
  ['AUS', 'Australia', ['australia', 'australian']], ['NZL', 'New Zealand', ['new zealand']], ['MEX', 'Mexico', ['mexico', 'mexican']],
  ['KOR', 'South Korea', ['south korea', 'korea', 'korean']], ['SAU', 'Saudi Arabia', ['saudi', 'saudi arabia']], ['ARE', 'UAE', ['uae', 'emirates', 'dubai']],
  ['NGA', 'Nigeria', ['nigeria', 'nigerian']], ['EGY', 'Egypt', ['egypt', 'egyptian']], ['KEN', 'Kenya', ['kenya', 'kenyan']],
  ['ETH', 'Ethiopia', ['ethiopia']], ['TUR', 'Türkiye', ['turkey', 'turkiye', 'türkiye', 'turkish']], ['VNM', 'Vietnam', ['vietnam', 'viet nam', 'vietnamese']],
  ['THA', 'Thailand', ['thailand', 'thai']], ['MYS', 'Malaysia', ['malaysia']], ['SGP', 'Singapore', ['singapore']], ['PHL', 'Philippines', ['philippines', 'filipino']],
  ['ARG', 'Argentina', ['argentina']], ['CHL', 'Chile', ['chile']], ['COL', 'Colombia', ['colombia']], ['IRN', 'Iran', ['iran']], ['ISR', 'Israel', ['israel']],
  ['SWE', 'Sweden', ['sweden', 'swedish']], ['NOR', 'Norway', ['norway']], ['CHE', 'Switzerland', ['switzerland', 'swiss']], ['NLD', 'Netherlands', ['netherlands', 'dutch']],
  ['POL', 'Poland', ['poland']], ['UKR', 'Ukraine', ['ukraine']], ['WLD', 'World', ['world', 'global', 'worldwide']],
  ['EUU', 'European Union', ['european union', 'eu', 'europe']], ['SAS', 'South Asia', ['south asia region']],
];
export const COUNTRY_NAME = Object.fromEntries(COUNTRIES.map(([c, n]) => [c, n]));

export const GROUPS = {
  brics: ['BRA', 'RUS', 'IND', 'CHN', 'ZAF'],
  g7: ['USA', 'JPN', 'DEU', 'GBR', 'FRA', 'ITA', 'CAN'],
  'south asia': ['IND', 'PAK', 'BGD', 'NPL', 'LKA'],
  saarc: ['IND', 'PAK', 'BGD', 'NPL', 'LKA', 'BTN'],
  asean: ['IDN', 'THA', 'MYS', 'SGP', 'PHL', 'VNM'],
  'major economies': ['USA', 'CHN', 'IND', 'DEU', 'JPN', 'BRA'],
  'emerging markets': ['IND', 'CHN', 'BRA', 'IDN', 'MEX', 'TUR'],
  africa: ['NGA', 'EGY', 'ZAF', 'KEN', 'ETH'],
  'nordic': ['SWE', 'NOR'],
};

const DEFAULT_COUNTRIES = ['USA', 'CHN', 'IND', 'DEU', 'JPN', 'BRA'];

const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');

export function parseCountries(text) {
  const t = ` ${String(text).toLowerCase()} `;
  const found = [];
  const add = (c) => { if (!found.includes(c)) found.push(c); };
  // Order of appearance matters (first is the focus country).
  const hits = [];
  for (const [g, list] of Object.entries(GROUPS)) { const m = t.search(wordRe(g)); if (m >= 0) hits.push([m, list]); }
  for (const [code, , aliases] of COUNTRIES) {
    for (const a of aliases) {
      if (a === 'eu' || a === 'uk') { const m = String(text).search(new RegExp(`\\b${a.toUpperCase()}\\b`)); if (m >= 0) hits.push([m, [code]]); continue; }
      const m = t.search(wordRe(a)); if (m >= 0) { hits.push([m, [code]]); break; }
    }
  }
  const us = String(text).search(/\b(US|USA|U\.S\.A?\.?)\b/);
  if (us >= 0) hits.push([us, ['USA']]);
  // ISO3 codes typed directly (e.g. "IND, PAK")
  for (const m of String(text).matchAll(/\b[A-Z]{3}\b/g)) if (COUNTRY_NAME[m[0]]) hits.push([m.index, [m[0]]]);
  hits.sort((a, b) => a[0] - b[0]).forEach(([, l]) => l.forEach(add));
  // "south asia" group should not also add the "South Asia" region aggregate
  return found.filter((c) => !(c === 'SAS' && found.includes('IND')));
}

export function parseYears(text, now = new Date().getFullYear()) {
  const t = String(text).toLowerCase();
  let m;
  if ((m = t.match(/(?:from|between)\s+(\d{4})\s+(?:to|and|-|–|until)\s+(\d{4})/)) || (m = t.match(/(\d{4})\s*(?:-|–|to)\s*(\d{4})/)))
    return { from: Math.min(+m[1], +m[2]), to: Math.max(+m[1], +m[2]) };
  if ((m = t.match(/(?:since|after|from)\s+(\d{4})/))) return { from: +m[1], to: now };
  if ((m = t.match(/(?:last|past)\s+(\d{1,2})\s+years?/))) return { from: now - +m[1], to: now };
  if ((m = t.match(/(?:last|past)\s+(decade)/))) return { from: now - 10, to: now };
  if ((m = t.match(/\bin\s+(\d{4})\b/))) return { from: +m[1] - 10, to: +m[1] };
  return { from: 2000, to: now };
}

export function parseIndicators(text) {
  const t = String(text).toLowerCase();
  const scored = [];
  for (const ind of INDICATORS) {
    let s = 0;
    for (const k of ind.kw) if (wordRe(k).test(t)) s = Math.max(s, k.length);
    if (s) scored.push([s, ind.code]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  let codes = scored.map((x) => x[1]);
  // "gdp per capita" also matches "gdp": keep the more specific one only.
  const rest = t.replace(/gdp per capita|gdp growth/g, '');
  if (!/\bgdp\b/.test(rest) && /gdp per capita|gdp growth/.test(t)) codes = codes.filter((c) => c !== 'NY.GDP.MKTP.CD');
  for (const [topic, list] of Object.entries(TOPICS)) {
    if (wordRe(topic).test(t) || (topic === 'economy' && /\beconom(y|ic|ies)\b/.test(t)) || (topic === 'climate' && /\benvironment/.test(t)))
      for (const c of list) if (!codes.includes(c)) codes.push(c);
  }
  return codes.slice(0, 6);
}

// Keyword planner: turns a plain-English question into a World Bank request.
// Works with no AI key; the AI planner (llm.js) can replace it when a key is set.
export function planFromText(text) {
  let indicators = parseIndicators(text);
  let countries = parseCountries(text);
  const { from, to } = parseYears(text);
  const understood = indicators.length > 0 || countries.length > 0;
  if (!indicators.length) indicators = [...TOPICS.economy];
  if (!countries.length) countries = [...DEFAULT_COUNTRIES];
  // A single country reads better next to the world average (rates only).
  if (countries.length === 1 && countries[0] !== 'WLD' && indicators.every((c) => !INDICATOR_BY_CODE[c]?.additive)) countries.push('WLD');
  return normalisePlan({ indicators, countries, from, to, focus: countries[0], understood, question: text });
}

export function normalisePlan(p) {
  const indicators = [...new Set((p.indicators || []).filter((c) => INDICATOR_BY_CODE[c]))].slice(0, 6);
  const countries = [...new Set((p.countries || []).map((c) => String(c).toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c)))].slice(0, 10);
  const now = new Date().getFullYear();
  let from = Math.max(1960, Math.min(now, parseInt(p.from, 10) || 2000));
  let to = Math.max(from, Math.min(now, parseInt(p.to, 10) || now));
  if (!indicators.length) throw new Error('No indicators selected.');
  if (!countries.length) throw new Error('No countries selected.');
  const focus = countries.includes(p.focus) ? p.focus : countries[0];
  const title = p.title || autoTitle(indicators, countries);
  return { type: 'worldbank', indicators, countries, from, to, focus, title, question: p.question || '', understood: p.understood !== false };
}

function autoTitle(indicators, countries) {
  const names = countries.filter((c) => c !== 'WLD').map((c) => COUNTRY_NAME[c] || c);
  const topic = INDICATOR_BY_CODE[indicators[0]]?.topic || 'economy';
  const topicName = { economy: 'Economy', trade: 'Trade', health: 'Health', climate: 'Climate', energy: 'Energy', digital: 'Digital adoption', education: 'Education', population: 'Population', poverty: 'Poverty & inequality', work: 'Jobs' }[topic];
  const who = names.length === 1 ? names[0] : names.length <= 3 ? names.join(', ') : `${names.length} countries`;
  return `${topicName}: ${who}`;
}

async function fetchJSON(url, signal) {
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('Could not reach the World Bank API. Check your connection and try again.');
  }
  if (!res.ok) throw new Error(`World Bank API returned ${res.status}.`);
  return res.json();
}

export async function fetchIndicator(code, countries, from, to, signal) {
  const url = `https://api.worldbank.org/v2/country/${countries.join(';')}/indicator/${encodeURIComponent(code)}?format=json&per_page=20000&date=${from}:${to}`;
  const json = await fetchJSON(url, signal);
  if (!Array.isArray(json) || json[0]?.message) {
    const msg = json?.[0]?.message?.[0]?.value || 'unknown error';
    throw new Error(`World Bank: ${msg}`);
  }
  return { url, rows: json[1] || [], lastUpdated: json[0]?.lastupdated };
}

// Returns wide rows: Country, Code, Year, <indicator label>...
export async function loadWorldBank(plan, { signal } = {}) {
  const results = await Promise.allSettled(plan.indicators.map((c) => fetchIndicator(c, plan.countries, plan.from, plan.to, signal)));
  const byKey = new Map();
  const ok = [];
  const failed = [];
  const urls = [];
  let lastUpdated = null;
  results.forEach((r, i) => {
    const ind = INDICATOR_BY_CODE[plan.indicators[i]];
    if (r.status !== 'fulfilled') { failed.push({ ind, error: r.reason?.message }); return; }
    urls.push(r.value.url);
    if (r.value.lastUpdated && (!lastUpdated || r.value.lastUpdated > lastUpdated)) lastUpdated = r.value.lastUpdated;
    let any = false;
    for (const row of r.value.rows) {
      const iso = row.countryiso3code || row.country?.id;
      const year = parseInt(row.date, 10);
      if (!iso || !Number.isFinite(year)) continue;
      const k = `${iso}|${year}`;
      if (!byKey.has(k)) byKey.set(k, { Country: COUNTRY_NAME[iso] || row.country?.value || iso, Code: iso, Year: year });
      if (row.value != null) { byKey.get(k)[ind.label] = row.value; any = true; }
    }
    if (any) ok.push(ind); else failed.push({ ind, error: 'no data for these countries and years' });
  });
  if (!ok.length) {
    const firstErr = failed[0]?.error || 'no data returned';
    throw new Error(failed.some((f) => /reach/.test(f.error || '')) ? firstErr : `The World Bank has no data for this selection (${firstErr}).`);
  }
  const headers = ['Country', 'Code', 'Year', ...ok.map((i) => i.label)];
  const rows = [...byKey.values()].sort((a, b) => a.Country.localeCompare(b.Country) || a.Year - b.Year);
  return { headers, rows, indicators: ok, failed, urls, lastUpdated };
}
