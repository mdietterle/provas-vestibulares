import { Navigate, useParams } from 'react-router-dom'
import { getUniversityBySlug } from '../data/universities'
import { UNIVERSITY_PAGE_MAP } from './universities'
import UniversityBasePage from './universities/UniversityBasePage'

export default function UniversityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug) return <Navigate to="/universidades" replace />

  const PageComponent = UNIVERSITY_PAGE_MAP[slug]
  if (PageComponent) {
    return <PageComponent />
  }

  const u = getUniversityBySlug(slug)
  if (!u) return <Navigate to="/universidades" replace />

  return <UniversityBasePage slug={slug} />
}
