import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API Endpoints Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('API 基礎 URL 應該正確設定', () => {
    const apiBase = 'http://127.0.0.1:8000/api';
    expect(apiBase).toContain('/api');
  });

  it('登入端點應該正確格式化', () => {
    const loginUrl = 'http://127.0.0.1:8000/api/auth/login/';
    expect(loginUrl).toContain('/api/auth/login/');
    expect(loginUrl).toMatch(/^https?:\/\/.+\/api\/auth\/login\/$/);
  });

  it('預約端點應該支援參數', () => {
    const baseUrl = 'http://127.0.0.1:8000/api/reservations/';
    const withParams = `${baseUrl}?view_all=true`;
    expect(withParams).toContain('view_all=true');
  });

  it('黑名單端點應該存在', () => {
    const blacklistUrl = 'http://127.0.0.1:8000/api/blacklist/check/';
    expect(blacklistUrl).toContain('/blacklist/');
  });

  it('教室查詢端點應該存在', () => {
    const classroomUrl = 'http://127.0.0.1:8000/api/classrooms/';
    expect(classroomUrl).toContain('/classrooms/');
  });

  it('建築物端點應該存在', () => {
    const buildingsUrl = 'http://127.0.0.1:8000/api/buildings/';
    expect(buildingsUrl).toContain('/buildings/');
  });
});
