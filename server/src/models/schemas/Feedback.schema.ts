import { ObjectId } from 'mongodb'
import { FeedbackStatus, FeedbackPriority, FeedbackCategory } from '../../constants/enums'

export interface FeedbackMessage {
  _id?: ObjectId
  sender_id: ObjectId
  sender_role: 'teacher' | 'admin'
  message: string
  attachments?: string[] // URLs to uploaded files
  created_at: Date
}

interface FeedbackType {
  _id?: ObjectId
  teacher_id: ObjectId
  admin_id?: ObjectId // Admin được assign để xử lý feedback này
  title: string
  category: FeedbackCategory
  priority: FeedbackPriority
  status: FeedbackStatus
  messages: FeedbackMessage[] // Conversation thread
  created_at?: Date
  updated_at?: Date
  resolved_at?: Date
  tags?: string[] // Để phân loại và tìm kiếm
}

export default class Feedback {
  _id?: ObjectId
  teacher_id: ObjectId
  admin_id?: ObjectId
  title: string
  category: FeedbackCategory
  priority: FeedbackPriority
  status: FeedbackStatus
  messages: FeedbackMessage[]
  created_at: Date
  updated_at: Date
  resolved_at?: Date
  tags: string[]

  constructor({
    _id,
    teacher_id,
    admin_id,
    title,
    category,
    priority,
    status,
    messages,
    created_at,
    updated_at,
    resolved_at,
    tags
  }: FeedbackType) {
    const date = new Date()
    
    this._id = _id
    this.teacher_id = teacher_id
    this.admin_id = admin_id
    this.title = title
    this.category = category || FeedbackCategory.Other
    this.priority = priority || FeedbackPriority.Medium
    this.status = status || FeedbackStatus.Pending
    this.messages = messages || []
    this.created_at = created_at || date
    this.updated_at = updated_at || date
    this.resolved_at = resolved_at
    this.tags = tags || []
  }

  // Helper methods
  addMessage(message: Omit<FeedbackMessage, '_id' | 'created_at'>): void {
    const newMessage: FeedbackMessage = {
      _id: new ObjectId(),
      ...message,
      created_at: new Date()
    }
    this.messages.push(newMessage)
    this.updated_at = new Date()
  }

  assignToAdmin(adminId: ObjectId): void {
    this.admin_id = adminId
    this.status = FeedbackStatus.InProgress
    this.updated_at = new Date()
  }

  resolve(): void {
    this.status = FeedbackStatus.Resolved
    this.resolved_at = new Date()
    this.updated_at = new Date()
  }

  close(): void {
    this.status = FeedbackStatus.Closed
    this.updated_at = new Date()
  }

  updatePriority(priority: FeedbackPriority): void {
    this.priority = priority
    this.updated_at = new Date()
  }

  addTags(newTags: string[]): void {
    this.tags = [...new Set([...this.tags, ...newTags])]
    this.updated_at = new Date()
  }

  removeTags(tagsToRemove: string[]): void {
    this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag))
    this.updated_at = new Date()
  }
}
