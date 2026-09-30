import { Navigate, useParams } from 'react-router-dom'
import { getStudyGuide } from '../data/studyGuides'
import StudyGuidePage from './universities/StudyGuidePage'

export default function UniversityStudyGuideRoute() {
  const { slug } = useParams<{ slug: string }>()
  const guide = slug ? getStudyGuide(slug) : undefined
  if (!slug || !guide) return <Navigate to={slug ? `/universidades/${slug}` : '/universidades'} replace />
  return <StudyGuidePage guide={guide} />
}
