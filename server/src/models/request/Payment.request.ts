import { PackageType } from '../schemas/PackagePriceType.schema'
import { PaymentStatus } from '../schemas/Payment.schema'

export interface CreatePaymentBody {
  package_id: string
  teacher_usernames?: string[] // For team packages
  note?: string
}

export interface UpdatePaymentStatusBody {
  status: PaymentStatus
  admin_note?: string
}

export interface GetPaymentsQuery {
  page?: string
  limit?: string
  status?: PaymentStatus
  package_type?: PackageType
  user_id?: string
  search?: string
  sort_by?: 'created_at' | 'updated_at' | 'amount'
  sort_order?: 'asc' | 'desc'
  from_date?: string
  to_date?: string
}

export interface CreatePackageBody {
  name: string
  type: PackageType
  price: number
  duration_months: number
  max_teachers: number
  question_generation_limit: number
  features: string[]
}

export interface UpdatePackageBody {
  name?: string
  price?: number
  duration_months?: number
  max_teachers?: number
  question_generation_limit?: number
  features?: string[]
  active?: boolean
}
