const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  // 教室相關
  buildings: () => `${API_BASE_URL}/api/rooms/classrooms/buildings/`,
  classrooms: (params = "") => `${API_BASE_URL}/api/rooms/classrooms/${params ? `?${params}` : ''}`,
  classroomDetail: (roomCode) => `${API_BASE_URL}/api/rooms/classrooms/${roomCode}/`,
  classroomStats: () => `${API_BASE_URL}/api/rooms/classrooms/stats/`,

  // 預約相關
  reservations: () => `${API_BASE_URL}/api/reservations/`,
  occupiedSlots: (params) => `${API_BASE_URL}/api/reservations/occupied/${params ? `?${params}` : ''}`,
  updateReservationStatus: (id) => `${API_BASE_URL}/api/reservations/${id}/status/`,
  cancelReservation: (id) => `${API_BASE_URL}/api/reservations/${id}/cancel/`,

  // 認證相關
  login: () => `${API_BASE_URL}/api/auth/login/`,
  register: () => `${API_BASE_URL}/api/auth/register/`,
  refresh: () => `${API_BASE_URL}/api/auth/refresh/`,
  me: () => `${API_BASE_URL}/api/auth/me/`,
  send_verification_email: () => `${API_BASE_URL}/api/auth/send_verification_email/`,
  send_change_pwd: () => `${API_BASE_URL}/api/auth/send_change_pwd/`,
  verify_change_pwd: () => `${API_BASE_URL}/api/auth/verify_change_pwd/`,

  // 🔥🔥 黑名單功能新增 ↓↓↓
  users: () => `${API_BASE_URL}/api/accounts/users/`,
  userDetail: (id) => `${API_BASE_URL}/api/accounts/users/${id}/`,
  //更改使用者資料
  change_name: () => `${API_BASE_URL}/api/auth/change_name/`,
  change_password: () => `${API_BASE_URL}/api/auth/change_password/`,
};

export default API_BASE_URL;
