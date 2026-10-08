import api from './client'
import type { Class, Exam, Institution, Question, Subject, TeachingAssignment, User } from '../types'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/login', new URLSearchParams({ username: email, password })),
  me: () => api.get<User>('/auth/me'),
  register: (
    data: { name: string; email: string; password: string } & (
      | { institution_id: number }
      | { institution_name: string }
    ),
  ) => api.post<{ message: string }>('/auth/register', data),
  forgotPassword: (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email }),
  verifyResetToken: (token: string) => api.get<{ valid: boolean; name: string; email: string }>(`/auth/verify-reset-token/${token}`),
  resetPassword: (token: string, password: string) => api.post<{ message: string }>('/auth/reset-password', { token, password }),
}

// ── Institutions ──────────────────────────────────────────────────────────────
export const institutionsApi = {
  list: () => api.get<Institution[]>('/institutions'),
  searchPublic: (q: string) => api.get<{ id: number; name: string }[]>('/institutions/public', { params: { q } }),
  create: (data: { name: string; cnpj?: string }) => api.post<Institution>('/institutions', data),
  update: (id: number, data: Partial<Institution>) => api.put<Institution>(`/institutions/${id}`, data),
  uploadLogo: (id: number, form: FormData) => api.post<Institution>(`/institutions/${id}/logo`, form),
  removeLogo: (id: number) => api.delete<Institution>(`/institutions/${id}/logo`),
}

// ── Billing (Stripe) ─────────────────────────────────────────────────────────
export const billingApi = {
  status: () => api.get<{
    plan_type: string | null
    stripe_subscription_status: string | null
    credits_balance: number
    has_stripe_customer: boolean
  }>('/billing/status'),
  checkoutSession: (plan: 'basic' | 'pro' | 'enterprise') =>
    api.post<{ url: string }>('/billing/checkout-session', null, { params: { plan } }),
  creditsCheckout: () => api.post<{ url: string }>('/billing/credits-checkout'),
  portal: () => api.post<{ url: string }>('/billing/portal'),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (role?: string) => api.get<User[]>('/users', { params: { role } }),
  create: (data: { name: string; email: string; password?: string; role: string; institution_id: number; car_access?: boolean }) =>
    api.post<User>('/users', data),
  update: (id: number, data: Partial<User> & { password?: string }) => api.put<User>(`/users/${id}`, data),
  toggleActive: (id: number) => api.patch<User>(`/users/${id}/toggle-active`),
  delete: (id: number) => api.delete(`/users/${id}`),
  assignments: (userId: number) => api.get<TeachingAssignment[]>(`/users/${userId}/assignments`),
}

export const invitationsApi = {
  resend: (userId: number) => api.post<User>(`/invitations/${userId}/resend`),
  verify: (token: string) => api.get<{ valid: boolean; student_name: string; email: string; institution_name: string }>(`/invitations/verify/${token}`),
  accept: (token: string, password: string) => api.post<{ message: string }>('/invitations/accept', { token, password }),
}

// ── Subjects ──────────────────────────────────────────────────────────────────
export const subjectsApi = {
  list: () => api.get<Subject[]>('/subjects'),
  create: (data: { name: string }) => api.post<Subject>('/subjects', data),
  update: (id: number, data: { name: string }) => api.put<Subject>(`/subjects/${id}`, data),
  delete: (id: number) => api.delete(`/subjects/${id}`),
}

// ── Classes ───────────────────────────────────────────────────────────────────
export const classesApi = {
  list: () => api.get<Class[]>('/classes'),
  create: (data: { name: string; year: number }) => api.post<Class>('/classes', data),
  update: (id: number, data: Partial<Class>) => api.put<Class>(`/classes/${id}`, data),
  delete: (id: number) => api.delete(`/classes/${id}`),
  listStudents: (classId: number) => api.get<User[]>(`/classes/${classId}/students`),
  addStudent: (classId: number, studentId: number) =>
    api.post(`/classes/${classId}/students/${studentId}`),
  removeStudent: (classId: number, studentId: number) =>
    api.delete(`/classes/${classId}/students/${studentId}`),
  listAssignments: (classId: number) =>
    api.get<TeachingAssignment[]>(`/classes/${classId}/assignments`),
  createAssignment: (data: { professor_id: number; subject_id: number; class_id: number }) =>
    api.post<TeachingAssignment>('/classes/assignments', data),
  deleteAssignment: (id: number) => api.delete(`/classes/assignments/${id}`),
}

// ── Questions ─────────────────────────────────────────────────────────────────
export const questionsApi = {
  list: (subjectId?: number) =>
    api.get<Question[]>('/questions', { params: subjectId ? { subject_id: subjectId } : {} }),
  create: (data: Omit<Question, 'id' | 'professor' | 'subject' | 'created_at' | 'professor_id'>) =>
    api.post<Question>('/questions', data),
  update: (id: number, data: Partial<Question>) => api.put<Question>(`/questions/${id}`, data),
  delete: (id: number) => api.delete(`/questions/${id}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  counts: { professors: number; students: number; subjects: number; classes: number; questions: number; exams: number }
  submissions: { total: number; pending: number; correcting: number; done: number; released: number }
  recent_activity: { id: number; status: string; total_score: number | null; submitted_at: string | null; student_name: string; exam_title: string; subject_name: string }[]
  exams_by_subject: { subject: string; count: number }[]
  growth: { new_users_this_month: number; new_users_last_month: number; new_exams_this_month: number }
  questions_by_difficulty: Record<string, number>
  monthly_user_growth: { month: string; new_users: number }[]
  monthly_exam_growth: { month: string; new_exams: number }[]
}

export interface MonitoringAlert {
  type: 'correction_backlog' | 'low_pass_rate' | 'low_submission_rate'
  severity: 'high' | 'medium'
  professor_name: string | null
  exam_title: string | null
  class_name: string | null
  detail: string
  exam_id: number | null
}

export interface ProfessorStat {
  id: number
  name: string
  exam_count: number
  pending_correction_count: number
  oldest_pending_days: number
  avg_pass_rate: number | null
  low_pass_rate_exams: { exam_id: number; exam_title: string; pass_rate: number; avg_score: number; max_score: number }[]
}

export interface ClassStat {
  id: number
  name: string
  year: string
  student_count: number
  exam_count: number
  avg_score: number | null
  avg_pass_rate: number | null
  submission_rate: number
  low_pass_rate_exams: { exam_id: number; exam_title: string; pass_rate: number }[]
}

export interface DashboardMonitoring {
  professor_stats: ProfessorStat[]
  class_stats: ClassStat[]
  alerts: MonitoringAlert[]
}

export interface ProfessorDashboardData {
  question_count: number
  exam_count: number
  ai_progress: number
  time_saved: string
  avg_score: number | null
  correction_by_class: { turma: string; total: number; corrigidos: number; pct: number }[]
}

export interface StudentDashboardData {
  avg_grade: number | null
  institution_avg_grade: number | null
  ranking_position: number | null
  total_ranked: number
  completion_rate: number | null
  grade_evolution: { mes: string; nota: number; fonte: 'prova' | 'simulado' | 'misto' }[]
  growth_pct: number | null
}

export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  monitoring: () => api.get<DashboardMonitoring>('/dashboard/monitoring'),
  professor: () => api.get<ProfessorDashboardData>('/dashboard/professor'),
  student: () => api.get<StudentDashboardData>('/dashboard/student'),
}

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  update: (data: { name?: string; current_password?: string; new_password?: string }) =>
    api.patch<User>('/auth/me', data),
  uploadAvatar: (form: FormData) =>
    api.post<User>('/auth/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeAvatar: () => api.delete<User>('/auth/me/avatar'),
}

// ── AI ────────────────────────────────────────────────────────────────────────
export interface GeneratedQuestion {
  statement: string
  question_type: 'multiple_choice' | 'true_false' | 'essay' | 'summation'
  difficulty?: 'easy' | 'medium' | 'hard'
  options: { text: string; is_correct: boolean; order?: number }[]
  correct_answer?: string
  explanation?: string
}

export const aiApi = {
  generateQuestions: (payload: {
    subject_id: number
    topic: string
    question_type: string
    difficulty: string
    count: number
    context?: string
  }) => api.post<GeneratedQuestion[]>('/ai/generate-questions', payload),
  status: () => api.get<{ available: boolean; model: string; message: string }>('/ai/status'),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  kind: 'submission' | 'correction' | 'release' | 'correcting'
  message: string
  score: number | null
  at: string
  read: boolean
}

export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
}

// ── ENEM Public Question Bank ─────────────────────────────────────────────────
export { enemApi } from './enem'
export type { EnemQuestion, EnemOption, EnemImportRequest, EnemPdfImportResult } from './enem'

// ── ACAFE Public Question Bank ────────────────────────────────────────────────
export { acafeApi } from './acafe'
export type { AcafeQuestion, AcafeOption, AcafeImage, AcafeImportRequest, AcafeUrlImportRequest, AcafeUrlImportResult } from './acafe'

// ── UFPR Public Question Bank ─────────────────────────────────────────────────
export { ufprApi } from './ufpr'
export type { UfprQuestion, UfprOption, UfprImage, UfprImportRequest } from './ufpr'

// ── UFRGS Public Question Bank ────────────────────────────────────────────────
export { ufrgsApi } from './ufrgs'
export type { UfrgsQuestion, UfrgsOption, UfrgsImportRequest } from './ufrgs'

// ── PUCPR Public Question Bank ────────────────────────────────────────────────
export { pucprApi } from './pucpr'
export type { PucprQuestion, PucprOption, PucprImportRequest, PucprUrlImportRequest, PucprUrlImportResult } from './pucpr'

// ── UFSC Public Question Bank ─────────────────────────────────────────────────
export { ufscApi } from './ufsc'
export type { UfscQuestion, UfscOption, UfscImage, UfscImportRequest, UfscPdfImportResult } from './ufsc'

// ── ITA Public Question Bank ──────────────────────────────────────────────────
export { itaApi } from './ita'
export type { ItaQuestion, ItaOption, ItaImage, ItaImportRequest, ItaPdfImportResult } from './ita'

// ── FGV Public Question Bank ──────────────────────────────────────────────────
export { fgvApi } from './fgv'
export type { FgvQuestion, FgvOption, FgvImage, FgvImportRequest, FgvPdfImportResult } from './fgv'

// ── ESPM Public Question Bank ─────────────────────────────────────────────────
export { espmApi } from './espm'
export type { EspmQuestion, EspmOption, EspmImage, EspmImportRequest, EspmPdfImportResult } from './espm'


// ── Simulados ─────────────────────────────────────────────────────────────────
export { simuladosApi } from './simulados'
export type { SimuladoDetail, SimuladoSummary, SimuladoTodayResponse, SimuladoDashboard, SimuladoQuestionItem, SimuladoOption, CreateSimuladoRequest } from './simulados'

// ── Owner ─────────────────────────────────────────────────────────────────────
export interface OwnerMetrics {
  mrr: number
  mrr_prev: number
  mrr_growth: number
  mrr_growth_trend_3m: number
  avg_tenure_months: number
  churn_rate: number
  retention_rate: number
  institutions_total: number
  institutions_new_month: number
  institutions_active: number
  users_total: number
  users_new_month: number
  professors_total: number
  exams_month: number
  submissions_month: number
  ai_generation_month: number
  ai_correction_month: number
  ai_overage_month: number
}

export interface OwnerInstitution {
  id: number
  name: string
  cnpj: string | null
  plan_type: string
  plan_since: string | null
  created_at: string | null
  professors: number
  students: number
  exams_total: number
  ai_generation_month: number
  ai_correction_month: number
  last_exam_at: string | null
  mrr: number
  status: 'ativo' | 'inativo'
  car_enabled: boolean
  is_active: boolean
}

export interface GrowthPoint {
  month: string
  new_institutions: number
  new_users: number
}

// ── Usage / Limits ──────────────────────────────────────────────────────────
export interface UsageResource {
  used: number
  limit: number | null   // null = ilimitado
  overage: number
}

export interface UsageProfessor {
  id: number
  name: string
  email: string
  is_active: boolean
  ai_generation: UsageResource
  ai_correction: UsageResource
}

export interface UsageSummary {
  plan: { type: string; label: string; ai_enabled: boolean }
  professors: { active: number; limit: number | null }
  totals: {
    ai_generation: number
    ai_correction: number
    ai_generation_overage: number
    ai_correction_overage: number
  }
  limits_per_professor: {
    ai_generation: number | null
    ai_correction: number | null
  }
  per_professor: UsageProfessor[]
}

export interface QuotaCheck {
  allowed: boolean
  used: number
  limit: number | null
  remaining: number | null
  overage_count: number
}

export interface MyQuota {
  ai_generation: QuotaCheck
  ai_correction: QuotaCheck
}

export const feedbackApi = {
  send: (data: { message: string; page_url: string; reporter_email?: string | null }) =>
    api.post('/feedback', data),
}

export const usageApi = {
  summary: () => api.get<UsageSummary>('/usage/summary'),
  myQuota: () => api.get<MyQuota>('/usage/my'),
}


export interface QuestionStat {
  university: string
  year: number
  subject: string
  count: number
}

export interface SimuladoStageStat {
  status: string
  count: number
}

export interface SchoolAverageStat {
  school: string
  average: number
}

export interface UniversityAverageStat {
  university: string
  average: number
}

export interface DetailedStatsResponse {
  questions: QuestionStat[]
  simulados_stages: SimuladoStageStat[]
  school_averages: SchoolAverageStat[]
  university_averages: UniversityAverageStat[]
}

export const ownerApi = {
  metrics: () => api.get<OwnerMetrics>('/owner/metrics'),
  institutions: () => api.get<OwnerInstitution[]>('/owner/institutions'),
  getTask: (taskId: string) => api.get<{status: string, current: number, total: number, items_done?: number | null, result?: any, error?: string, logs: {time: number, message: string}[]}>(`/owner/tasks/${taskId}`),
  growth: () => api.get<GrowthPoint[]>('/owner/growth'),
  detailedStats: () => api.get<DetailedStatsResponse>('/owner/stats/detailed'),
  updatePlan: (id: number, plan_type: string) =>
    api.patch(`/owner/institutions/${id}/plan`, null, { params: { plan_type } }),
  updateModules: (id: number, car_enabled: boolean) =>
    api.patch(`/owner/institutions/${id}/modules`, null, { params: { car_enabled } }),
  deleteQuestions: (university: string, params?: { year?: number; since_year?: number; until_year?: number }) =>
    api.delete<{ deleted: number; message: string }>(`/owner/questions/${university}`, { params }),
  createSchool: (data: { name: string; cnpj?: string; admin_name: string; admin_email: string; admin_password: string }) =>
    api.post<{ id: number; name: string; cnpj: string | null; is_active: boolean; admin_email: string }>('/owner/institutions', data),
  setSchoolActive: (id: number, is_active: boolean) =>
    api.patch<{ ok: boolean; is_active: boolean }>(`/owner/institutions/${id}/active`, null, { params: { is_active } }),
  deleteSchool: (id: number) =>
    api.delete<{ ok: boolean }>(`/owner/institutions/${id}`),
  users: (params?: { search?: string; role?: string; institution_id?: number; include_deleted?: boolean }) =>
    api.get<OwnerUser[]>('/owner/users', { params }),
  toggleUserActive: (id: number) =>
    api.patch<OwnerUser>(`/owner/users/${id}/active`),
  changeUserRole: (id: number, role: string) =>
    api.patch<OwnerUser>(`/owner/users/${id}/role`, { role }),
  deleteUser: (id: number) =>
    api.delete(`/owner/users/${id}`),
}

// ── Questões reportadas por alunos ───────────────────────────────────────────
export interface QuestionReportGroup {
  exam_type: string
  question_id: number
  status: string
  count: number
  reasons: string[]
  latest_details: string | null
  last_reported_at: string | null
  statement_preview: string | null
}

export interface QuestionReportOption {
  id: number
  letter: string
  text: string
  is_correct: boolean
  order: number
  value: number | null
}

export interface ReportedQuestionDetail {
  question: {
    statement: string
    area: string | null
    question_type: string
    answer: number | null
    options: QuestionReportOption[]
  }
  reports: {
    id: number
    reason: string
    details: string | null
    status: string
    created_at: string | null
  }[]
}

export const ownerQuestionReportsApi = {
  list: (status: string = 'pending') =>
    api.get<QuestionReportGroup[]>('/owner/question-reports', { params: { status } }),
  detail: (examType: string, questionId: number) =>
    api.get<ReportedQuestionDetail>(`/owner/question-reports/${examType}/${questionId}`),
  updateQuestion: (examType: string, questionId: number, data: { statement: string; options: { id: number; text: string; is_correct: boolean }[] }) =>
    api.put(`/owner/question-reports/${examType}/${questionId}/question`, data),
  release: (examType: string, questionId: number) =>
    api.post<{ ok: boolean; resolved: number }>(`/owner/question-reports/${examType}/${questionId}/release`),
  deleteQuestion: (examType: string, questionId: number) =>
    api.delete<{ ok: boolean }>(`/owner/question-reports/${examType}/${questionId}/question`),
}

export interface OwnerUser {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  deleted_at: string | null
  institution_id: number
  institution_name: string
  created_at: string
}

// ── Question banks (vestibular) ─────────────────────────────────────────────────
export interface QuestionBankAvailability {
  slug: string
  count: number
}

export const questionBanksApi = {
  available: () => api.get<QuestionBankAvailability[]>('/question-banks/available'),
}

// ── Exams ─────────────────────────────────────────────────────────────────────
export const examsApi = {
  list: (params?: { subject_id?: number; class_id?: number }) =>
    api.get<Exam[]>('/exams', { params }),
  create: (data: {
    title: string
    instructions?: string
    subject_id: number
    class_id: number
    questions: { question_id: number; order: number; points: number }[]
  }) => api.post<Exam>('/exams', data),
  createRedacao: (data: {
    title: string
    subject_id: number
    class_id: number
    enunciado: string
    points: number
    criteria?: string
  }) => api.post<Exam>('/exams/redacao', data),
  get: (id: number) => api.get<Exam>(`/exams/${id}`),
  update: (id: number, data: Partial<Exam>) => api.put<Exam>(`/exams/${id}`, data),
  delete: (id: number) => api.delete(`/exams/${id}`),
  apply: (id: number, class_id: number) => api.post<Exam>(`/exams/${id}/apply`, { class_id }),
  pdfUrl: (id: number) => `/api/exams/${id}/pdf`,
}

export { api }
export { uerjApi } from './uerj'
export { ufgdApi } from './ufgd'
export { uemApi } from './uem'
export { ufmsApi } from './ufms'
export { fuvestApi } from './fuvest'
export { pucrioApi } from './pucrio'
export { udescApi } from './udesc'

export const unespApi = {
  runSeed: (since?: number, until?: number) => api.post('/unesp/import', undefined, { params: { since_year: since, until_year: until } }),
};

export const cebraspeApi = {
  runSeed: (since?: number, until?: number) => api.post('/cebraspe/import', undefined, { params: { since_year: since, until_year: until } }),
};

export const unifespApi = {
  runSeed: (since?: number, until?: number) => api.post('/unifesp/import', undefined, { params: { since_year: since, until_year: until } }),
};

export const pucrsApi = {
  runImportAll: (since?: number, until?: number) => api.post('/pucrs-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
};

export const ufpelApi = {
  runImportAll: (since?: number, until?: number) => api.post('/ufpel-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
};

export const unicampApi = {
  runImportAll: (since?: number, until?: number) => api.post('/unicamp-questions/admin/import-all', undefined, { params: { since_year: since, until_year: until } }),
};

export const ufgApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ufg/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const ufjfApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ufjf/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const ufuApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ufu/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const ufpaApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ufpa/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const utfprApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/utfpr/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const unioesteApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/unioeste/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const uelApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/uel/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const pucminasApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/pucminas/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const ufrnApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ufrn/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const ufsmApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ufsm/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const ulbraApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ulbra/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const ufamApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/ufam/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const puccampinasApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/puccampinas/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const unimontesApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/unimontes/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const unicentroApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/unicentro/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

export const unaerpApi = {
  runImportAll: async (since?: number, until?: number) => {
    const response = await api.post('/unaerp/import', undefined, { params: { since_year: since, until_year: until } })
    return response
  }
}

