import { ObjectId } from 'mongodb'

interface StudentCommentType {
  _id?: ObjectId
  student_id: ObjectId
  subject_id: ObjectId
  class_name: string
  semester: number
  school_year: string
  teacher_id: ObjectId

  // Các loại nhận xét
  strengths: string[] // Ưu điểm nổi bật
  weaknesses: string[] // Hạn chế cần khắc phục
  progress: string // Sự tiến bộ

  // Điểm trung bình để làm căn cứ lọc nhận xét
  average_score?: number

  created_at?: Date
  updated_at?: Date
}

export default class StudentComment {
  _id?: ObjectId
  student_id: ObjectId
  subject_id: ObjectId
  class_name: string
  semester: number
  school_year: string
  teacher_id: ObjectId
  strengths: string[]
  weaknesses: string[]
  progress: string
  average_score?: number
  created_at: Date
  updated_at: Date

  constructor({
    _id,
    student_id,
    subject_id,
    class_name,
    semester,
    school_year,
    teacher_id,
    strengths,
    weaknesses,
    progress,
    average_score,
    created_at,
    updated_at
  }: StudentCommentType) {
    const date = new Date()
    this._id = _id
    this.student_id = student_id
    this.subject_id = subject_id
    this.class_name = class_name
    this.semester = semester
    this.school_year = school_year
    this.teacher_id = teacher_id
    this.strengths = strengths || []
    this.weaknesses = weaknesses || []
    this.progress = progress || ''
    this.average_score = average_score
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
