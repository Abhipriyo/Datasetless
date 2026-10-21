import { describe, it, expect } from 'vitest';
import { fmt, compact, fmtPeriod } from '../src/lib/format.js';
import { encodeShare, decodeShare } from '../src/lib/share.js';

describe('format', () => {
  it('formats compact numbers and currencies', () => {
    expect(compact(1234)).toBe('1.2K');
    expect(compact(2.5e9)).toBe('2.5B');
    expect(fmt(29100000, 'currency', '₹')).toBe('₹2.91 Cr');
    expect(fmt(-1500, 'currency', '$')).toBe('-$1.5K');
    expect(fmt(12.345, 'percent')).toBe('12.3%');
    expect(fmt(null)).toBe('–');
  });
  it('formats periods', () => {
    expect(fmtPeriod('2026-09', 'month')).toBe('Sep 2026');
    expect(fmtPeriod('2026-09', 'month', true)).toBe("Sep '26");
    expect(fmtPeriod('2026-Q3', 'quarter', true)).toBe("Q3 '26");
  });
});

describe('share links', () => {
  it('round-trips a recipe', () => {
    const p = { source: { type: 'sample', id: 'store' }, asks: [{ sql: 'SELECT 1' }] };
    expect(decodeShare(encodeShare(p))).toMatchObject(p);
    expect(decodeShare('garbage')).toBeNull();
  });
});
