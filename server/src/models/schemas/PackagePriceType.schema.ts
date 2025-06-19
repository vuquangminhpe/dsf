import { ObjectId } from 'mongodb'

export enum PackageType {
  SINGLE = 'single',
  TEAM_3 = 'team_3',
  TEAM_7 = 'team_7'
}

interface PackagePriceType {
  _id?: ObjectId
  name: string
  type: PackageType
  price: number
  duration_months: number
  max_teachers: number
  question_generation_limit: number
  features: string[]
  active: boolean
  created_at?: Date
  updated_at?: Date
}

export default class PackagePrice {
  _id?: ObjectId
  name: string
  type: PackageType
  price: number
  duration_months: number
  max_teachers: number
  question_generation_limit: number
  features: string[]
  active: boolean
  created_at: Date
  updated_at: Date

  constructor({
    _id,
    name,
    type,
    price,
    duration_months,
    max_teachers,
    question_generation_limit,
    features,
    active,
    created_at,
    updated_at
  }: PackagePriceType) {
    const date = new Date()
    this._id = _id
    this.name = name
    this.type = type
    this.price = price
    this.duration_months = duration_months
    this.max_teachers = max_teachers
    this.question_generation_limit = question_generation_limit
    this.features = features
    this.active = active !== undefined ? active : true
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
