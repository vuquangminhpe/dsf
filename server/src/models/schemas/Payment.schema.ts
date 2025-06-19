import { ObjectId } from 'mongodb'

enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

interface PaymentType {
  _id?: ObjectId
  user_id: ObjectId
  amount: number
  status: PaymentStatus
  created_at?: Date
  updated_at?: Date
}

export default class Payment {
  _id?: ObjectId
  user_id: ObjectId
  amount: number
  status: PaymentStatus
  created_at: Date
  updated_at: Date

  constructor({ _id, user_id, amount, status, created_at, updated_at }: PaymentType) {
    const date = new Date()
    this._id = _id
    this.user_id = user_id
    this.amount = amount
    this.status = status || 'pending'
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
