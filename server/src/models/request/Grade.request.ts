import { Query } from 'express-serve-static-core'
import { ExamTypeEnum } from '../schemas/Comment.schema'

export interface GetClassGradesQuery extends Query {
  subject_id: string
  semester: string
  school_year: string
}

export interface GetStudentGradesQuery extends Query {
  subject_id?: string
  semester?: string
  school_year?: string
}

export interface GetSubjectsQuery extends Query {
  grade_level?: 'elementary' | 'middle_school' | 'high_school'
}

export interface GetCommentsQuery extends Query {
  category?: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_IMPROVEMENT' | 'POOR'
  type?: 'STRENGTH' | 'WEAKNESS' | 'PROGRESS'
  grade_level?: 'elementary' | 'middle_school' | 'high_school'
}

export interface CreateGradeBody {
  student_id: string
  subject_id: string
  class_name: string
  semester: number
  school_year: string
  exam_type: ExamTypeEnum
  exam_sequence?: number
  score: number
}

export interface UpdateGradeBody {
  score: number
}

export interface DeleteGradeBody {
  student_id: string
  subject_id: string
  exam_type: ExamTypeEnum
  exam_sequence?: number
}

export interface BulkGradeUpdate {
  student_id: string
  exam_type: ExamTypeEnum
  exam_sequence?: number
  score: number
}

export interface BulkCommentUpdate {
  student_id: string
  strengths: string[]
  weaknesses: string[]
  progress: string
  average_score?: number
}

export interface UpdateBulkGradesBody {
  grades: BulkGradeUpdate[]
  comments: BulkCommentUpdate[]
  class_name: string
  subject_id: string
  semester: number
  school_year: string
}

export interface ExportGradesQuery extends Query {
  class_name: string
  subject_id: string
  semester: string
  school_year: string
  format?: 'excel' | 'pdf'
}

export interface ImportGradesBody {
  class_name: string
  subject_id: string
  semester: number
  school_year: string
  grades: {
    student_username: string
    exam_type: ExamTypeEnum
    exam_sequence?: number
    score: number
  }[]
}

export interface StudentGradeStatistics {
  student_id: string
  tx_scores: number[]
  gk_score?: number
  ck_score?: number
  average_score?: number
  rank_in_class?: number
}

export interface ClassGradeStatistics {
  class_name: string
  subject_id: string
  semester: number
  school_year: string
  total_students: number
  students_with_grades: number
  average_score: number
  highest_score: number
  lowest_score: number
  pass_rate: number
  grade_distribution: {
    excellent: number // 8.5-10
    good: number // 7.0-8.4
    average: number // 5.5-6.9
    weak: number // 4.0-5.4
    poor: number // 0-3.9
  }
}

export interface GetClassStatisticsQuery extends Query {
  subject_id: string
  semester: string
  school_year: string
}

export interface CreateCommentBody {
  student_id: string
  subject_id: string
  class_name: string
  semester: number
  school_year: string
  strengths: string[]
  weaknesses: string[]
  progress: string
  average_score?: number
}

export interface UpdateCommentBody {
  strengths?: string[]
  weaknesses?: string[]
  progress?: string
  average_score?: number
}

export interface GetGradeHistoryQuery extends Query {
  student_id: string
  subject_id?: string
  school_year?: string
}

export interface GradeParams {
  grade_id: string
}

export interface StudentParams {
  student_id: string
}

export interface ClassParams {
  className: string
}

export interface SubjectParams {
  subject_id: string
}
