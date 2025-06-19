import { FeedbackStatus, FeedbackPriority, FeedbackCategory } from '../../constants/enums'

export interface CreateFeedbackBody {
  title: string
  category: FeedbackCategory
  priority?: FeedbackPriority
  message: string
  attachments?: string[]
  tags?: string[]
}

export interface UpdateFeedbackBody {
  title?: string
  category?: FeedbackCategory
  priority?: FeedbackPriority
  status?: FeedbackStatus
  tags?: string[]
}

export interface AddMessageBody {
  message: string
  attachments?: string[]
}

export interface AssignFeedbackBody {
  admin_id: string
}

export interface GetFeedbacksQuery {
  page?: string
  limit?: string
  status?: FeedbackStatus
  priority?: FeedbackPriority
  category?: FeedbackCategory
  teacher_id?: string
  admin_id?: string
  search?: string
  tags?: string
  sort_by?: 'created_at' | 'updated_at' | 'priority'
  sort_order?: 'asc' | 'desc'
}

export interface FeedbackStatsQuery {
  teacher_id?: string
  admin_id?: string
  from_date?: string
  to_date?: string
}
