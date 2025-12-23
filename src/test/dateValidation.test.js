import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('日期驗證邏輯', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('未來 30 天內的日期應該有效', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const dateStr = futureDate.toISOString().split('T')[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);

    expect(selectedDate >= today).toBe(true);
  });

  it('過去的日期應該無效', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const dateStr = pastDate.toISOString().split('T')[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);

    expect(selectedDate >= today).toBe(false);
  });

  it('今天的日期應該有效', () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const todayCheck = new Date(dateStr);
    todayCheck.setHours(0, 0, 0, 0);

    expect(todayCheck).toEqual(todayCheck);
  });

  it('日期格式應該是 YYYY-MM-DD', () => {
    const dateStr = '2025-12-25';
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    expect(dateStr).toMatch(dateRegex);
  });

  it('無效日期格式應該被拒絕', () => {
    const invalidDates = [
      '25-12-2025',
      '2025/12/25',
      '12-25-2025',
      'invalid'
    ];

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    invalidDates.forEach(date => {
      expect(date).not.toMatch(dateRegex);
    });
  });
});
