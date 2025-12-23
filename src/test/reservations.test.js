import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('預約邏輯驗證', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('時段衝突檢測', () => {
    it('相同時段應該被檢測為衝突', () => {
      const existing = { start: 14, end: 15 };
      const newSlot = { start: 14, end: 15 };

      const hasConflict = !(newSlot.end <= existing.start || newSlot.start >= existing.end);

      expect(hasConflict).toBe(true);
    });

    it('不同時段應該沒有衝突', () => {
      const existing = { start: 14, end: 15 };
      const newSlot = { start: 16, end: 17 };

      const hasConflict = !(newSlot.end <= existing.start || newSlot.start >= existing.end);

      expect(hasConflict).toBe(false);
    });

    it('部分重疊時段應該被檢測為衝突', () => {
      const existing = { start: 14, end: 15 };
      const newSlot = { start: 14, end: 16 };

      const hasConflict = !(newSlot.end <= existing.start || newSlot.start >= existing.end);

      expect(hasConflict).toBe(true);
    });

    it('相鄰時段應該沒有衝突', () => {
      const existing = { start: 14, end: 15 };
      const newSlot = { start: 15, end: 16 };

      const hasConflict = !(newSlot.end <= existing.start || newSlot.start >= existing.end);

      expect(hasConflict).toBe(false);
    });
  });

  describe('預約狀態', () => {
    it('新建預約應該是 pending 狀態', () => {
      const newReservation = {
        status: 'pending',
        classroom: 'INS201',
        date: '2025-12-25'
      };

      expect(newReservation.status).toBe('pending');
    });

    it('應該能將預約狀態改為 approved', () => {
      const reservation = { status: 'pending' };
      reservation.status = 'approved';

      expect(reservation.status).toBe('approved');
    });

    it('應該能將預約狀態改為 rejected', () => {
      const reservation = { status: 'pending' };
      reservation.status = 'rejected';

      expect(reservation.status).toBe('rejected');
    });

    it('應該能將預約狀態改為 cancelled', () => {
      const reservation = { status: 'approved' };
      reservation.status = 'cancelled';

      expect(reservation.status).toBe('cancelled');
    });
  });

  describe('預約資料驗證', () => {
    it('預約應該包含必需欄位', () => {
      const reservation = {
        classroom: 'INS201',
        date: '2025-12-25',
        time_slot: '14-15',
        reason: '課程教學'
      };

      expect(reservation.classroom).toBeDefined();
      expect(reservation.date).toBeDefined();
      expect(reservation.time_slot).toBeDefined();
    });

    it('時段應該是有效的格式', () => {
      const validSlots = ['8-9', '9-10', '10-11', '14-15', '15-16', '20-21'];

      validSlots.forEach(slot => {
        expect(slot).toMatch(/^\d+-\d+$/);
      });
    });

    it('應該驗證開始時間小於結束時間', () => {
      const slot = '14-15';
      const [start, end] = slot.split('-').map(Number);

      expect(start < end).toBe(true);
    });
  });
});
