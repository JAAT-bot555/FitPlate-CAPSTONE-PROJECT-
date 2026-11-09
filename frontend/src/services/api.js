import axios from 'axios';

export const TOKEN_KEY = 'fitplate_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function errMsg(error) {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.request) {
    return 'Cannot reach the server. Is the backend running?';
  }
  return error?.message || 'Something went wrong';
}

export default api;
