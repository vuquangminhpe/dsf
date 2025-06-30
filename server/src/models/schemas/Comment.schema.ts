import { ObjectId } from 'mongodb'

export enum ExamTypeEnum {
  TX = 'TX', // Thường xuyên
  GK = 'GK', // Giữa kỳ
  CK = 'CK' // Cuối kỳ
}

interface GradeType {
  _id?: ObjectId
  student_id: ObjectId
  subject_id: ObjectId
  class_name: string
  semester: number
  school_year: string
  exam_type: ExamTypeEnum
  exam_sequence?: number // Thứ tự bài kiểm tra (TX1, TX2, ...)
  score: number
  teacher_id: ObjectId
  created_at?: Date
  updated_at?: Date
}

export default class Grade {
  _id?: ObjectId
  student_id: ObjectId
  subject_id: ObjectId
  class_name: string
  semester: number
  school_year: string
  exam_type: ExamTypeEnum
  exam_sequence?: number
  score: number
  teacher_id: ObjectId
  created_at: Date
  updated_at: Date

  constructor({
    _id,
    student_id,
    subject_id,
    class_name,
    semester,
    school_year,
    exam_type,
    exam_sequence,
    score,
    teacher_id,
    created_at,
    updated_at
  }: GradeType) {
    const date = new Date()
    this._id = _id
    this.student_id = student_id
    this.subject_id = subject_id
    this.class_name = class_name
    this.semester = semester
    this.school_year = school_year
    this.exam_type = exam_type
    this.exam_sequence = exam_sequence
    this.score = score
    this.teacher_id = teacher_id
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
