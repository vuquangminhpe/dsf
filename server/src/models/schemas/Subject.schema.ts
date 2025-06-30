import { ObjectId } from 'mongodb'

export enum GradeLevel {
  Elementary = 'elementary', // Tiểu học
  MiddleSchool = 'middle_school', // THCS
  HighSchool = 'high_school' // THPT
}

interface SubjectType {
  _id?: ObjectId
  name: string
  code: string
  grade_level: GradeLevel
  is_main_subject: boolean // Môn chính hay phụ
  evaluation_type: 'grade' | 'comment' | 'both' // Đánh giá bằng điểm, nhận xét, hoặc cả hai
  created_at?: Date
  updated_at?: Date
}

export default class Subject {
  _id?: ObjectId
  name: string
  code: string
  grade_level: GradeLevel
  is_main_subject: boolean
  evaluation_type: 'grade' | 'comment' | 'both'
  created_at: Date
  updated_at: Date

  constructor({ _id, name, code, grade_level, is_main_subject, evaluation_type, created_at, updated_at }: SubjectType) {
    const date = new Date()
    this._id = _id
    this.name = name
    this.code = code
    this.grade_level = grade_level
    this.is_main_subject = is_main_subject
    this.evaluation_type = evaluation_type
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
