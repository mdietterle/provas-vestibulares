import { Route } from 'react-router-dom'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import ExamCalendarPage from './pages/ExamCalendarPage'
import HelpPage from './pages/HelpPage'
import PlansPage from './pages/PlansPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import QuotePage from './pages/QuotePage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import UniversitiesIndexPage from './pages/UniversitiesIndexPage'
import UniversityDetailPage from './pages/UniversityDetailPage'
import UniversityStudyGuideRoute from './pages/UniversityStudyGuideRoute'

/** Rotas públicas, compartilhadas entre o App (navegador) e o entry-server
 * (prerender do HTML completo no build). */
export function publicRoutes() {
  return (
    <>
      <Route path="/plans" element={<PlansPage />} />
      <Route path="/quote" element={<QuotePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacidade" element={<PrivacyPolicyPage />} />
      <Route path="/termos" element={<TermsOfServicePage />} />
      <Route path="/sobre" element={<AboutPage />} />
      <Route path="/ajuda" element={<HelpPage />} />
      <Route path="/universidades" element={<UniversitiesIndexPage />} />
      <Route path="/universidades/:slug/como-estudar" element={<UniversityStudyGuideRoute />} />
      <Route path="/universidades/:slug" element={<UniversityDetailPage />} />
      <Route path="/calendario" element={<ExamCalendarPage />} />
    </>
  )
}
