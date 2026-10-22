import { describe, it, expect } from 'vitest';
import { parseContract } from '../src/lib/metrics.js';

describe('metrics contract', () => {
  it('parses metrics, shorthand columns and defaults', () => {
    const { contract, errors } = parseContract({
      time: 'date', grain: 'month', dimensions: ['region'],
      metrics: [
        { id: 'revenue', label: 'Revenue', sql: 'sum(revenue) - sum(refunds)', format: 'currency', tests: [{ type: 'min', value: 0 }] },
        { id: 'orders', column: 'orders', agg: 'sum' },
        { id: 'refund_rate', label: 'Refund rate', sql: '100.0 * sum(refunds) / nullif(sum(revenue), 0)' },
      ],
    });
    expect(errors).toEqual([]);
    expect(contract.metrics[0].additive).toBe(true);
    expect(contract.metrics[1].sql).toBe('sum("orders")');
    expect(contract.metrics[2].additive).toBe(false);
    expect(contract.metrics[2].format).toBe('percent');
  });
  it('rejects unsafe or malformed definitions', () => {
    const { errors } = parseContract({ metrics: [
      { id: 'x', sql: "sum(a); DROP TABLE data" },
      { id: 'y', sql: "(SELECT 1)" },
      { id: '1bad', sql: 'sum(a)' },
      { id: 'z' },
      { id: 'w', sql: "read_csv('https://evil.example/x')" },
    ] });
    expect(errors).toHaveLength(5);
  });
  it('reports invalid JSON', () => {
    expect(parseContract('{nope').contract).toBeNull();
  });
});
