import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
});

export default api;
