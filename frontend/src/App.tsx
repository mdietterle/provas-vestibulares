import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProfessorsPage from './pages/ProfessorsPage'
import StudentsPage from './pages/StudentsPage'
import SubjectsPage from './pages/SubjectsPage'
import ClassesPage from './pages/ClassesPage'
import QuestionsPage from './pages/QuestionsPage'
import ExamsPage from './pages/ExamsPage'
import ExamDetailPage from './pages/ExamDetailPage'
import SchoolSettingsPage from './pages/SchoolSettingsPage'
import ExamSubmitPage from './pages/ExamSubmitPage'
import ExamResultPage from './pages/ExamResultPage'
import SubmissionsPage from './pages/SubmissionsPage'
import ExamAnalyticsPage from './pages/ExamAnalyticsPage'
import CorrectionsPage from './pages/CorrectionsPage'
import ScanUploadPage from './pages/ScanUploadPage'
import ProfilePage from './pages/ProfilePage'
import UserAccessPage from './pages/UserAccessPage'
import UsagePage from './pages/UsagePage'
import SubscriptionPage from './pages/SubscriptionPage'
import EnemBankPage from './pages/EnemBankPage'
import AcafeBankPage from './pages/AcafeBankPage'
import UfprBankPage from './pages/UfprBankPage'
import UfrgsBankPage from './pages/UfrgsBankPage'
import PucprBankPage from './pages/PucprBankPage'
import ItaBankPage from './pages/ItaBankPage'
import PlansPage from './pages/PlansPage'
import QuotePage from './pages/QuotePage'
import ContactPage from './pages/ContactPage'
import OwnerPage from './pages/OwnerPage'
import OwnerSchoolsPage from './pages/OwnerSchoolsPage'
import OwnerUsersPage from './pages/OwnerUsersPage'
import OwnerQuestionReportsPage from './pages/OwnerQuestionReportsPage'
import OwnerStatsPage from './pages/OwnerStatsPage'
import OwnerImportersPage from './pages/OwnerImportersPage'
import SimuladoPage from './pages/SimuladoPage'
import SimuladoExamPage from './pages/SimuladoExamPage'
import SimuladoDashboardPage from './pages/SimuladoDashboardPage'
import RedacaoListPage from './pages/RedacaoListPage'
import RedacaoPage from './pages/RedacaoPage'
import RedacaoReviewPage from './pages/RedacaoReviewPage'
import InvitationPage from './pages/InvitationPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import AboutPage from './pages/AboutPage'
import StudentAuthPage from './pages/StudentAuthPage'
import HelpPage from './pages/HelpPage'
import UniversitiesIndexPage from './pages/UniversitiesIndexPage'
import UniversityDetailPage from './pages/UniversityDetailPage'
import ExamCalendarPage from './pages/ExamCalendarPage'
import LandingPage from './pages/LandingPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import FeedbackWidget from './components/FeedbackWidget'

function RootRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>
  if (!user) return <LandingPage />
  return <>{children}</>
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'owner') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'owner' ? '/billing' : '/'} replace /> : <LoginPage />} />
      <Route path="/aluno" element={user ? <Navigate to="/" replace /> : <StudentAuthPage />} />
      <Route path="/plans" element={<PlansPage />} />
      <Route path="/quote" element={<QuotePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/convite/:token" element={<InvitationPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha/:token" element={<ResetPasswordPage />} />
      <Route path="/privacidade" element={<PrivacyPolicyPage />} />
      <Route path="/termos" element={<TermsOfServicePage />} />
      <Route path="/sobre" element={<AboutPage />} />
      <Route path="/ajuda" element={<HelpPage />} />
      <Route path="/universidades" element={<UniversitiesIndexPage />} />
      <Route path="/universidades/:slug" element={<UniversityDetailPage />} />
      <Route path="/calendario" element={<ExamCalendarPage />} />
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
