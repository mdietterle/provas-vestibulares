import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mesmo backend usado pelo frontend web (ver frontend/src/api/client.ts).
// Em dev local, aponte EXPO_PUBLIC_API_URL para o IP da máquina rodando o backend
// (não use localhost: no emulador/device isso não resolve para o seu computador).
const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL || 'https://provas-khsq.onrender.com';

export const TOKEN_KEY = 'token';

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
