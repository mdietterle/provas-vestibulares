import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { TOKEN_KEY } from './client';

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface MeResponse {
  role: string;
}

export class NotStudentError extends Error {
  constructor() {
    super('Este aplicativo é exclusivo para alunos.');
    this.name = 'NotStudentError';
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).');
    this.name = 'EmailNotVerifiedError';
  }
}

// Backend usa OAuth2PasswordRequestForm (form-urlencoded), ver backend/app/routers/auth.py.
export async function login(email: string, password: string) {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);

  let data: TokenResponse;
  try {
    const res = await api.post<TokenResponse>('/auth/login', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    data = res.data;
  } catch (err: any) {
    if (err?.response?.status === 403) throw new EmailNotVerifiedError();
    throw err;
  }

  await AsyncStorage.setItem(TOKEN_KEY, data.access_token);

  try {
    const { data: me } = await api.get<MeResponse>('/auth/me');
    if (me.role !== 'student') {
      await AsyncStorage.removeItem(TOKEN_KEY);
      throw new NotStudentError();
    }
  } catch (err) {
    if (err instanceof NotStudentError) throw err;
    await AsyncStorage.removeItem(TOKEN_KEY);
    throw err;
  }

  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  institution: { id: number } | { name: string },
) {
  const { data } = await api.post<{ message: string }>('/auth/register', {
    name,
    email,
    password,
    ...('id' in institution ? { institution_id: institution.id } : { institution_name: institution.name }),
  });
  return data;
}

export async function resendConfirmation(email: string) {
  const { data } = await api.post<{ message: string }>('/auth/resend-confirmation', { email });
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

// Valida uma sessão já armazenada (ex.: ao reabrir o app), garantindo que
// apenas alunos permaneçam autenticados no app mobile.
export async function hasValidStudentSession() {
  const token = await getStoredToken();
  if (!token) return false;

  try {
    const { data: me } = await api.get<MeResponse>('/auth/me');
    if (me.role !== 'student') {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return false;
    }
    return true;
  } catch {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return false;
  }
}
