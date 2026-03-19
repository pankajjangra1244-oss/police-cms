import axios from 'axios';
import Cookies from 'js-cookie';

const NEXT_URL = process.env.NEXT_PUBLIC_API_URL || '';
const api = axios.create({
  baseURL: NEXT_URL ? `${NEXT_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Typed API helpers ----

export const authAPI = {
  login: (badge_number: string, password: string) =>
    api.post('/auth/login', { badge_number, password }),
  me: () => api.get('/auth/me'),
  register: (data: object) => api.post('/auth/register', data),
};

export const complaintsAPI = {
  list: (params?: object) => api.get('/complaints', { params }),
  get: (id: string) => api.get(`/complaints/${id}`),
  create: (data: object) => api.post('/complaints', data),
  update: (id: string, data: object) => api.put(`/complaints/${id}`, data),
  delete: (id: string) => api.delete(`/complaints/${id}`),
};

export const uploadsAPI = {
  upload: (complaintId: string, files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    return api.post(`/uploads/${complaintId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (complaintId: string) => api.get(`/uploads/${complaintId}`),
  delete: (fileId: string) => api.delete(`/uploads/file/${fileId}`),
};

export const analyticsAPI = {
  summary: () => api.get('/analytics/summary'),
  byType: () => api.get('/analytics/by-type'),
  byMonth: () => api.get('/analytics/by-month'),
  byStatus: () => api.get('/analytics/by-status'),
  hotspots: () => api.get('/analytics/hotspots'),
  insights: () => api.get('/analytics/ai-insights'),
};

export const aiAPI = {
  extract: (text: string) => api.post('/ai/extract', { text }),
  suggestType: (text: string) => api.post('/ai/suggest-type', { text }),
};
