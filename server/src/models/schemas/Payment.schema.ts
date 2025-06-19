import { ObjectId } from 'mongodb'
import { PackageType } from './PackagePriceType.schema'

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum PaymentMethod {
  QR_CODE = 'qr_code'
}

interface PaymentType {
  _id?: ObjectId
  user_id: ObjectId
  package_id: ObjectId
  package_type: PackageType
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  teacher_usernames?: string[] // For team packages
  qr_code_url: string
  note?: string
  admin_note?: string
  processed_by?: ObjectId // Admin who processed the payment
  processed_at?: Date
  expires_at?: Date
  created_at?: Date
  updated_at?: Date
}

export default class Payment {
  _id?: ObjectId
  user_id: ObjectId
  package_id: ObjectId
  package_type: PackageType
  amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  teacher_usernames?: string[]
  qr_code_url: string
  note?: string
  admin_note?: string
  processed_by?: ObjectId
  processed_at?: Date
  expires_at?: Date
  created_at: Date
  updated_at: Date

  constructor({
    _id,
    user_id,
    package_id,
    package_type,
    amount,
    payment_method,
    status,
    teacher_usernames,
    qr_code_url,
    note,
    admin_note,
    processed_by,
    processed_at,
    expires_at,
    created_at,
    updated_at
  }: PaymentType) {
    const date = new Date()
    this._id = _id
    this.user_id = user_id
    this.package_id = package_id
    this.package_type = package_type
    this.amount = amount
    this.payment_method = payment_method || PaymentMethod.QR_CODE
    this.status = status || PaymentStatus.PENDING
    this.teacher_usernames = teacher_usernames
    this.qr_code_url = qr_code_url
    this.note = note
    this.admin_note = admin_note
    this.processed_by = processed_by
    this.processed_at = processed_at
    this.expires_at = expires_at
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
