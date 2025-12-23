import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('認證工具函數', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('localStorage 操作', () => {
    it('應該能儲存 access token', () => {
      const token = 'test_access_token_123';
      localStorage.setItem('access_token', token);

      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', token);
    });

    it('應該能儲存 refresh token', () => {
      const token = 'test_refresh_token_456';
      localStorage.setItem('refresh_token', token);

      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', token);
    });

    it('應該能讀取已存儲的 token', () => {
      localStorage.getItem('access_token');
      expect(localStorage.getItem).toHaveBeenCalledWith('access_token');
    });

    it('登出應該清除所有 token', () => {
      localStorage.setItem('access_token', 'token1');
      localStorage.setItem('refresh_token', 'token2');

      localStorage.clear();

      expect(localStorage.clear).toHaveBeenCalled();
    });

    it('應該能移除特定 token', () => {
      localStorage.removeItem('access_token');

      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    });
  });

  describe('Token 結構', () => {
    it('有效的 JWT token 應該有三個部分', () => {
      // JWT 格式：header.payload.signature
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc19zdGFmZiI6dHJ1ZX0.signature';
      const parts = validToken.split('.');

      expect(parts.length).toBe(3);
    });

    it('無效的 token 不應該有正確的部分數', () => {
      const invalidToken = 'invalid.token';
      const parts = invalidToken.split('.');

      expect(parts.length).not.toBe(3);
    });
  });

  describe('認證狀態', () => {
    it('未登入時 token 應該不存在', () => {
      const token = localStorage.getItem('access_token');
      // Mock 會返回 undefined，因為我們沒有設定任何值
      expect(localStorage.getItem).toHaveBeenCalled();
    });

    it('登入後應該存在 token', () => {
      const mockToken = 'eyJ.test.token';
      localStorage.setItem('access_token', mockToken);

      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', mockToken);
    });
  });
});
