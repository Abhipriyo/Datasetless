import { describe, it, expect } from 'vitest';
import { parsePasted, parseNumberLike, toCSV, parseDelimited } from '../src/lib/parse.js';

describe('parseNumberLike', () => {
  it('cleans currency, separators, percent and suffixes', () => {
    expect(parseNumberLike('₹1,20,000')).toBe(120000);
    expect(parseNumberLike('$4.5M')).toBe(4.5e6);
    expect(parseNumberLike('12%')).toBe(12);
    expect(parseNumberLike('(250)')).toBe(-250);
    expect(parseNumberLike('−3.5')).toBe(-3.5);
    expect(parseNumberLike('n/a')).toBe(null);
    expect(parseNumberLike('North')).toBe(undefined);
  });
});

describe('parsePasted', () => {
  it('reads spreadsheet TSV and cleans numeric columns', () => {
    const t = parsePasted('Region\tSales\tGrowth\nNorth\t1,200\t5%\nSouth\t980\t-2%');
    expect(t.headers).toEqual(['Region', 'Sales', 'Growth (%)']);
    expect(t.rows[0]).toEqual(['North', '1200', '5']);
  });
  it('reads markdown tables', () => {
    const t = parsePasted('| a | b |\n|---|---|\n| x | 1 |\n| y | 2 |');
    expect(t.headers).toEqual(['a', 'b']);
    expect(t.rows).toHaveLength(2);
  });
  it('dedupes headers and strips footnotes', () => {
    const t = parsePasted('Name,Value[1],Value\nA,1,2');
    expect(t.headers).toEqual(['Name', 'Value', 'Value 2']);
  });
  it('rejects empty input', () => {
    expect(() => parsePasted('   ')).toThrow();
  });
});

describe('CSV round trip', () => {
  it('quotes fields with commas and quotes', () => {
    const csv = toCSV(['a', 'b'], [['x, y', 'say "hi"']]);
    expect(parseDelimited(csv)).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
  });
});
