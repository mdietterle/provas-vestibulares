export type UserRole = 'owner' | 'admin' | 'professor' | 'student'
export type QuestionType = 'multiple_choice' | 'true_false' | 'essay' | 'summation'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Institution {
  id: number
  name: string
  cnpj?: string
  logo?: string
  created_at: string
}

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  is_active: boolean
  car_access?: boolean
  avatar?: string | null
  deleted_at?: string | null
  institution_id?: number | null
  pending_institution_name?: string | null
  car_enabled?: boolean
  institution_verified?: boolean
  created_at: string
  invitation_sent_at?: string | null
  invitation_accepted_at?: string | null
  invitation_status?: 'pending' | 'accepted' | null
}

export interface Subject {
  id: number
  name: string
  institution_id: number
}

export interface Class {
  id: number
  name: string
  year: number
  institution_id: number
}

export interface TeachingAssignment {
  id: number
  professor_id: number
  subject_id: number
  class_id: number
  professor: User
  subject: Subject
  class_: Class
}

export interface QuestionOption {
  id: number
  text: string
  is_correct: boolean
  order: number
}

export interface Question {
  id: number
  statement: string
  question_type: QuestionType
  is_public: boolean
  difficulty?: Difficulty
  image_base64?: string | null
  subject_id: number
  professor_id: number
  professor: User
  subject: Subject
  options: QuestionOption[]
  created_at: string
}

export interface ExamQuestion {
  id: number
  question_id: number
  order: number
  points: number
  question: Question
}

export interface Exam {
  id: number
  title: string
  instructions?: string
  professor_id: number
  subject_id: number
  class_id: number
  professor: User
  subject: Subject
  class_: Class
  exam_questions: ExamQuestion[]
  created_at: string
  question_count?: number
}
