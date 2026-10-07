import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import FeedbackWidget from './components/FeedbackWidget'
import { publicRoutes } from './publicRoutes'

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfessorsPage = lazy(() => import('./pages/ProfessorsPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const QuestionsPage = lazy(() => import('./pages/QuestionsPage'))
const ExamsPage = lazy(() => import('./pages/ExamsPage'))
const ExamDetailPage = lazy(() => import('./pages/ExamDetailPage'))
const SchoolSettingsPage = lazy(() => import('./pages/SchoolSettingsPage'))
const ExamSubmitPage = lazy(() => import('./pages/ExamSubmitPage'))
const ExamResultPage = lazy(() => import('./pages/ExamResultPage'))
const SubmissionsPage = lazy(() => import('./pages/SubmissionsPage'))
const ExamAnalyticsPage = lazy(() => import('./pages/ExamAnalyticsPage'))
const CorrectionsPage = lazy(() => import('./pages/CorrectionsPage'))
const ScanUploadPage = lazy(() => import('./pages/ScanUploadPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const UserAccessPage = lazy(() => import('./pages/UserAccessPage'))
const UsagePage = lazy(() => import('./pages/UsagePage'))
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'))
const EnemBankPage = lazy(() => import('./pages/EnemBankPage'))
const AcafeBankPage = lazy(() => import('./pages/AcafeBankPage'))
const UfprBankPage = lazy(() => import('./pages/UfprBankPage'))
const UfrgsBankPage = lazy(() => import('./pages/UfrgsBankPage'))
const PucprBankPage = lazy(() => import('./pages/PucprBankPage'))
const ItaBankPage = lazy(() => import('./pages/ItaBankPage'))
const VestibularBankPage = lazy(() => import('./pages/VestibularBankPage'))
function VestibularBankRoute() {
  const { examType } = useParams<{ examType: string }>()
  return <VestibularBankPage examType={examType ?? ''} />
}
const OwnerPage = lazy(() => import('./pages/OwnerPage'))
const OwnerSchoolsPage = lazy(() => import('./pages/OwnerSchoolsPage'))
const OwnerUsersPage = lazy(() => import('./pages/OwnerUsersPage'))
const OwnerQuestionReportsPage = lazy(() => import('./pages/OwnerQuestionReportsPage'))
const OwnerStatsPage = lazy(() => import('./pages/OwnerStatsPage'))
const OwnerImportersPage = lazy(() => import('./pages/OwnerImportersPage'))
const SimuladoPage = lazy(() => import('./pages/SimuladoPage'))
const SimuladoExamPage = lazy(() => import('./pages/SimuladoExamPage'))
const SimuladoDashboardPage = lazy(() => import('./pages/SimuladoDashboardPage'))
const RedacaoListPage = lazy(() => import('./pages/RedacaoListPage'))
const RedacaoPage = lazy(() => import('./pages/RedacaoPage'))
const RedacaoReviewPage = lazy(() => import('./pages/RedacaoReviewPage'))
const InvitationPage = lazy(() => import('./pages/InvitationPage'))
const StudentAuthPage = lazy(() => import('./pages/StudentAuthPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#712ae2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  )
}

function RootRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingFallback />
  if (!user) return <LandingPage />
  return <>{children}</>
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingFallback />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'owner') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'owner' ? '/billing' : '/'} replace /> : <LoginPage />} />
        <Route path="/aluno" element={user ? <Navigate to="/" replace /> : <StudentAuthPage />} />
        <Route path="/convite/:token" element={<InvitationPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha/:token" element={<ResetPasswordPage />} />
        {publicRoutes()}
        <Route path="/" element={<RootRoute><Layout /></RootRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="professors" element={<ProfessorsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="exams/:id" element={<ExamDetailPage />} />
          <Route path="school" element={<SchoolSettingsPage />} />
          <Route path="exams/:id/submit" element={<ExamSubmitPage />} />
          <Route path="exams/:id/result" element={<ExamResultPage />} />
          <Route path="exams/:id/submissions" element={<SubmissionsPage />} />
          <Route path="exams/:id/analytics" element={<ExamAnalyticsPage />} />
          <Route path="corrections" element={<CorrectionsPage />} />
          <Route path="exams/:id/scan" element={<ScanUploadPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="user-access" element={<UserAccessPage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="enem-bank" element={<EnemBankPage />} />
          <Route path="acafe-bank" element={<AcafeBankPage />} />
          <Route path="ufpr-bank" element={<UfprBankPage />} />
          <Route path="ufrgs-bank" element={<UfrgsBankPage />} />
          <Route path="pucpr-bank" element={<PucprBankPage />} />
          <Route path="ita-bank" element={<ItaBankPage />} />
          <Route path="vestibular/:examType" element={<VestibularBankRoute />} />
          <Route path="simulados" element={<SimuladoPage />} />
          <Route path="simulados/dashboard" element={<SimuladoDashboardPage />} />
          <Route path="simulados/:id" element={<SimuladoExamPage />} />
          <Route path="redacoes" element={<RedacaoListPage />} />
          <Route path="redacoes/nova" element={<RedacaoPage />} />
          <Route path="redacoes/professor" element={<RedacaoListPage />} />
          <Route path="redacoes/:id" element={<RedacaoPage />} />
          <Route path="redacoes/:id/review" element={<RedacaoReviewPage />} />
        </Route>
        <Route path="/billing" element={<OwnerRoute><Layout /></OwnerRoute>}>
          <Route index element={<OwnerPage />} />
        </Route>
        <Route path="/owner" element={<OwnerRoute><Layout /></OwnerRoute>}>
          <Route path="schools" element={<OwnerSchoolsPage />} />
          <Route path="users" element={<OwnerUsersPage />} />
          <Route path="question-reports" element={<OwnerQuestionReportsPage />} />
          <Route path="stats" element={<OwnerStatsPage />} />
          <Route path="importers" element={<OwnerImportersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <FeedbackWidget />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}