import { describe, it, expect } from 'vitest';
import { planFromText, parseCountries, parseYears, normalisePlan } from '../src/lib/sources/worldbank.js';

describe('keyword planner', () => {
  it('finds countries in order and expands groups', () => {
    expect(parseCountries('India vs China')).toEqual(['IND', 'CHN']);
    expect(parseCountries('BRICS life expectancy')).toEqual(['BRA', 'RUS', 'IND', 'CHN', 'ZAF']);
    expect(parseCountries('the US and UK')).toEqual(expect.arrayContaining(['USA', 'GBR']));
    expect(parseCountries('show us the data')).toEqual([]);
  });
  it('parses year ranges', () => {
    expect(parseYears('since 2010', 2026)).toEqual({ from: 2010, to: 2026 });
    expect(parseYears('from 1995 to 2005', 2026)).toEqual({ from: 1995, to: 2005 });
    expect(parseYears('last 15 years', 2026)).toEqual({ from: 2011, to: 2026 });
  });
  it('maps questions to indicators', () => {
    const p = planFromText("How has India's GDP growth compared with China since 2010?");
    expect(p.indicators[0]).toBe('NY.GDP.MKTP.KD.ZG');
    expect(p.indicators).not.toContain('NY.GDP.MKTP.CD');
    expect(p.countries).toEqual(['IND', 'CHN']);
    expect(p.from).toBe(2010);
    expect(p.focus).toBe('IND');
  });
  it('adds the world average for a single country with rate indicators', () => {
    expect(planFromText('inflation in Japan').countries).toEqual(['JPN', 'WLD']);
  });
  it('falls back to an overview when nothing is recognised', () => {
    const p = planFromText('hello');
    expect(p.understood).toBe(false);
    expect(p.indicators.length).toBeGreaterThan(0);
  });
  it('validates plans', () => {
    expect(() => normalisePlan({ indicators: ['BAD'], countries: ['IND'] })).toThrow();
    expect(normalisePlan({ indicators: ['SP.POP.TOTL'], countries: ['ind'], from: 1900, to: 3000 }).from).toBe(1960);
  });
});
