import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulseig_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('pulseig_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
};

export const conversationsApi = {
  list: (params?: any) => api.get('/conversations', { params }),
  get: (id: string) => api.get(`/conversations/${id}`),
  sendMessage: (id: string, content: string) => api.post(`/conversations/${id}/message`, { content }),
  toggleAI: (id: string) => api.patch(`/conversations/${id}/toggle-ai`),
  setStatus: (id: string, status: string) => api.patch(`/conversations/${id}/status`, { status }),
};

export const contactsApi = {
  list: (params?: any) => api.get('/contacts', { params }),
  get: (id: string) => api.get(`/contacts/${id}`),
  update: (id: string, data: any) => api.patch(`/contacts/${id}`, data),
};

export const productsApi = {
  list: () => api.get('/products'),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const triggersApi = {
  list: () => api.get('/triggers'),
  create: (keyword: string, response: string) => api.post('/triggers', { keyword, response }),
  toggle: (id: string) => api.patch(`/triggers/${id}/toggle`),
  delete: (id: string) => api.delete(`/triggers/${id}`),
};

export const dashboardApi = {
  metrics: (period?: number) => api.get('/dashboard/metrics', { params: { period: period || 30 } }),
};

export const campaignsApi = {
  getReengagement: (days?: number) => api.get('/campaigns/reengagement', { params: { days } }),
  sendReengagement: (contact_id: string, message: string) => api.post('/campaigns/reengagement/send', { contact_id, message }),
  sendAllReengagement: (messages: any[]) => api.post('/campaigns/reengagement/send-all', { messages }),
  getAbandonedCarts: () => api.get('/campaigns/abandoned-carts'),
  getAnalytics: () => api.get('/campaigns/analytics'),
  getSettings: () => api.get('/campaigns/settings'),
  updateSettings: (data: any) => api.patch('/campaigns/settings', data),
};

export const webhookApi = {
  simulate: (business_id: string, sender_id: string, message: string) =>
    api.post('/webhook/simulate', { business_id, sender_id, message }),
};

export default api;
