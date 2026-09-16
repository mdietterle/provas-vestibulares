import api from './client';

export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar: string | null;
  institution_id: number;
}

export interface SimuladoSummary {
  id: number;
  exam_type: string;
  created_at: string;
  total_score: number | null;
  status: string;
}

export interface DashboardByArea {
  total: number;
  correct: number;
  pct: number;
}

export interface StudentDashboard {
  total_simulados: number;
  completed_simulados: number;
  average_score: number | null;
  best_score: number | null;
  simulados_this_week: number;
  by_exam_type: Record<string, { count: number; avg_score: number | null }>;
  by_area: Record<string, DashboardByArea>;
  recent_simulados: SimuladoSummary[];
}

export const fetchMe = () => api.get<UserOut>('/auth/me').then((r) => r.data);

export const fetchStudentDashboard = () =>
  api.get<StudentDashboard>('/simulados/dashboard').then((r) => r.data);

export interface ProfileUpdatePayload {
  name?: string;
  current_password?: string;
  new_password?: string;
}

export const updateProfile = (payload: ProfileUpdatePayload) =>
  api.patch<UserOut>('/auth/me', payload).then((r) => r.data);

export const uploadAvatar = (uri: string, mimeType: string) => {
  const form = new FormData();
  const filename = uri.split('/').pop() ?? 'avatar.jpg';
  // React Native FormData accepts { uri, name, type } instead of a Blob.
  form.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);
  return api
    .post<UserOut>('/auth/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};

export const removeAvatar = () => api.delete<UserOut>('/auth/me/avatar').then((r) => r.data);
