import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '../../constants/enums'

// Add this enum to User.schema.js
export enum UserRole {
  Student = 'student',
  Teacher = 'teacher',
  Admin = 'admin'
}

export enum PaymentStatus {
  NotPayment = 'not_payment',
  Paid = 'paid',
  Expired = 'expired'
}

export enum TeacherLevel {
  Elementary = 'elementary', // Tiểu học
  MiddleSchool = 'middle_school', // THCS
  HighSchool = 'high_school', // THPT
  University = 'university' // Đại học
}

export default class UserType {
  // Existing fields
  _id?: ObjectId
  password: string
  created_at?: Date
  updated_at?: Date
  email_verify_token?: string
  forgot_password_token?: string
  verify?: UserVerifyStatus
  role: UserRole
  name: string
  username?: string
  email?: string
  avatar?: string
  class: string

  // New fields
  payment_status?: PaymentStatus
  teacher_level?: TeacherLevel
  age?: number
  gender?: 'nam' | 'nữ'
  phone?: string
  created_by_teacher?: ObjectId // ID của giáo viên tạo tài khoản học sinh

  constructor(user: UserType) {
    const date = new Date()
    this._id = user._id
    this.password = user.password
    this.created_at = user.created_at || date
    this.updated_at = user.updated_at || date
    this.email_verify_token = user.email_verify_token || ''
    this.forgot_password_token = user.forgot_password_token || ''
    this.verify = user.verify || UserVerifyStatus.Unverified
    this.role = user.role || UserRole.Teacher // Mặc định là teacher
    this.username = user.username || ''
    this.email = user.email || ''
    this.avatar = user.avatar || ''
    this.name = user.name || ''
    this.class = user.class || ''

    // New fields
    this.payment_status = user.payment_status || PaymentStatus.NotPayment
    this.teacher_level = user.teacher_level
    this.age = user.age
    this.gender = user.gender
    this.phone = user.phone
    this.created_by_teacher = user.created_by_teacher
  }
}
