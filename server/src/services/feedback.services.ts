import { ObjectId, WithId } from 'mongodb'
import databaseService from './database.services'
import Feedback, { FeedbackMessage } from '../models/schemas/Feedback.schema'
import { FeedbackStatus, FeedbackPriority, FeedbackCategory } from '../constants/enums'
import {
  CreateFeedbackBody,
  UpdateFeedbackBody,
  AddMessageBody,
  GetFeedbacksQuery,
  FeedbackStatsQuery
} from '../models/request/Feedback.request'
import { FEEDBACK_CONFIG } from '../constants/feedback'

class FeedbackService {
  // ID của admin cố định quản lý tất cả feedback
  private readonly ADMIN_ID = FEEDBACK_CONFIG.ADMIN_ID

  // Tạo feedback mới (chỉ giáo viên)
  async createFeedback(teacher_id: string, body: CreateFeedbackBody) {
    const initialMessage: FeedbackMessage = {
      _id: new ObjectId(),
      sender_id: new ObjectId(teacher_id),
      sender_role: 'teacher',
      message: body.message,
      attachments: body.attachments || [],
      created_at: new Date()
    }

    const feedback = new Feedback({
      teacher_id: new ObjectId(teacher_id),
      admin_id: new ObjectId(this.ADMIN_ID), // Tự động assign cho admin cố định
      title: body.title,
      category: body.category,
      priority: body.priority || FeedbackPriority.Medium,
      status: FeedbackStatus.InProgress, // Chuyển thẳng sang InProgress vì đã có admin
      messages: [initialMessage],
      tags: body.tags || []
    })

    const result = await databaseService.feedbacks.insertOne(feedback)
    return result
  }

  // Lấy danh sách feedback với phân trang và filter
  async getFeedbacks(query: GetFeedbacksQuery) {
    const {
      page = '1',
      limit = '10',
      status,
      priority,
      category,
      teacher_id,
      admin_id,
      search,
      tags,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = query

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Build filter
    const filter: any = {}

    if (status) filter.status = status
    if (priority) filter.priority = priority
    if (category) filter.category = category
    if (teacher_id) filter.teacher_id = new ObjectId(teacher_id)
    if (admin_id) filter.admin_id = new ObjectId(admin_id)

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'messages.message': { $regex: search, $options: 'i' } }
      ]
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag: any) => tag.trim())
      filter.tags = { $in: tagArray }
    }

    // Build sort
    const sort: any = {}
    sort[sort_by] = sort_order === 'asc' ? 1 : -1

    const [feedbacks, total] = await Promise.all([
      databaseService.feedbacks.find(filter).sort(sort).skip(skip).limit(limitNum).toArray(),
      databaseService.feedbacks.countDocuments(filter)
    ])

    return {
      feedbacks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    }
  }

  // Lấy feedback theo ID
  async getFeedbackById(feedback_id: string) {
    const feedback = await databaseService.feedbacks.findOne({
      _id: new ObjectId(feedback_id)
    })
    return feedback
  }
  // Cập nhật feedback (chỉ admin cố định hoặc giáo viên tạo)
  async updateFeedback(feedback_id: string, body: UpdateFeedbackBody, user_id: string, user_role: string) {
    const feedback = await this.getFeedbackById(feedback_id)
    if (!feedback) {
      throw new Error('Feedback not found')
    }

    // Kiểm tra quyền: chỉ admin cố định hoặc giáo viên tạo mới được update
    if (user_role !== 'admin' && feedback.teacher_id.toString() !== user_id) {
      throw new Error('Permission denied')
    }

    // Nếu là admin nhưng không phải admin cố định
    if (user_role === 'admin' && user_id !== this.ADMIN_ID) {
      throw new Error('Permission denied')
    }

    const updateData: any = {
      updated_at: new Date()
    }

    if (body.title) updateData.title = body.title
    if (body.category) updateData.category = body.category
    if (body.priority) updateData.priority = body.priority
    if (body.status) updateData.status = body.status
    if (body.tags) updateData.tags = body.tags

    // Nếu status được set thành resolved, cập nhật resolved_at
    if (body.status === FeedbackStatus.Resolved) {
      updateData.resolved_at = new Date()
    }

    const result = await databaseService.feedbacks.findOneAndUpdate(
      { _id: new ObjectId(feedback_id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  }
  // Thêm message mới vào feedback
  async addMessage(feedback_id: string, body: AddMessageBody, user_id: string, user_role: 'teacher' | 'admin') {
    const feedback = await this.getFeedbackById(feedback_id)
    if (!feedback) {
      throw new Error('Feedback not found')
    }

    // Kiểm tra quyền: chỉ admin cố định hoặc giáo viên tạo feedback
    if (user_role !== 'admin' && feedback.teacher_id.toString() !== user_id) {
      throw new Error('Permission denied')
    }

    // Nếu là admin nhưng không phải admin cố định
    if (user_role === 'admin' && user_id !== this.ADMIN_ID) {
      throw new Error('Permission denied')
    }

    const newMessage: FeedbackMessage = {
      _id: new ObjectId(),
      sender_id: new ObjectId(user_id),
      sender_role: user_role,
      message: body.message,
      attachments: body.attachments || [],
      created_at: new Date()
    }

    const result = await databaseService.feedbacks.findOneAndUpdate(
      { _id: new ObjectId(feedback_id) },
      {
        $push: { messages: newMessage },
        $set: { updated_at: new Date() }
      },
      { returnDocument: 'after' }
    )

    return result
  }

  // Assign feedback cho admin (chỉ admin)
  async assignFeedback(feedback_id: string, admin_id: string) {
    const result = await databaseService.feedbacks.findOneAndUpdate(
      { _id: new ObjectId(feedback_id) },
      {
        $set: {
          admin_id: new ObjectId(admin_id),
          status: FeedbackStatus.InProgress,
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  }

  // Đóng feedback (chỉ admin)
  async closeFeedback(feedback_id: string) {
    const result = await databaseService.feedbacks.findOneAndUpdate(
      { _id: new ObjectId(feedback_id) },
      {
        $set: {
          status: FeedbackStatus.Closed,
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  }

  // Resolve feedback (chỉ admin)
  async resolveFeedback(feedback_id: string) {
    const result = await databaseService.feedbacks.findOneAndUpdate(
      { _id: new ObjectId(feedback_id) },
      {
        $set: {
          status: FeedbackStatus.Resolved,
          resolved_at: new Date(),
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  }
  // Xóa feedback (chỉ admin cố định hoặc giáo viên tạo)
  async deleteFeedback(feedback_id: string, user_id: string, user_role: string) {
    const feedback = await this.getFeedbackById(feedback_id)
    if (!feedback) {
      throw new Error('Feedback not found')
    }

    // Kiểm tra quyền
    if (user_role !== 'admin' && feedback.teacher_id.toString() !== user_id) {
      throw new Error('Permission denied')
    }

    // Nếu là admin nhưng không phải admin cố định
    if (user_role === 'admin' && user_id !== this.ADMIN_ID) {
      throw new Error('Permission denied')
    }

    const result = await databaseService.feedbacks.deleteOne({
      _id: new ObjectId(feedback_id)
    })

    return result
  }

  // Lấy thống kê feedback
  async getFeedbackStats(query: FeedbackStatsQuery) {
    const { teacher_id, admin_id, from_date, to_date } = query

    const matchStage: any = {}

    if (teacher_id) matchStage.teacher_id = new ObjectId(teacher_id)
    if (admin_id) matchStage.admin_id = new ObjectId(admin_id)

    if (from_date || to_date) {
      matchStage.created_at = {}
      if (from_date) matchStage.created_at.$gte = new Date(from_date)
      if (to_date) matchStage.created_at.$lte = new Date(to_date)
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', FeedbackStatus.Pending] }, 1, 0] }
          },
          in_progress: {
            $sum: { $cond: [{ $eq: ['$status', FeedbackStatus.InProgress] }, 1, 0] }
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', FeedbackStatus.Resolved] }, 1, 0] }
          },
          closed: {
            $sum: { $cond: [{ $eq: ['$status', FeedbackStatus.Closed] }, 1, 0] }
          },
          low_priority: {
            $sum: { $cond: [{ $eq: ['$priority', FeedbackPriority.Low] }, 1, 0] }
          },
          medium_priority: {
            $sum: { $cond: [{ $eq: ['$priority', FeedbackPriority.Medium] }, 1, 0] }
          },
          high_priority: {
            $sum: { $cond: [{ $eq: ['$priority', FeedbackPriority.High] }, 1, 0] }
          },
          urgent_priority: {
            $sum: { $cond: [{ $eq: ['$priority', FeedbackPriority.Urgent] }, 1, 0] }
          }
        }
      }
    ]

    const [stats] = await databaseService.feedbacks.aggregate(pipeline).toArray()

    return (
      stats || {
        total: 0,
        pending: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        low_priority: 0,
        medium_priority: 0,
        high_priority: 0,
        urgent_priority: 0
      }
    )
  }

  // Lấy feedback theo giáo viên
  async getFeedbacksByTeacher(teacher_id: string, query: GetFeedbacksQuery) {
    return this.getFeedbacks({ ...query, teacher_id })
  }

  // Lấy feedback được assign cho admin
  async getFeedbacksByAdmin(admin_id: string, query: GetFeedbacksQuery) {
    return this.getFeedbacks({ ...query, admin_id })
  }

  // Lấy top tags
  async getTopTags(limit: number = 10) {
    const pipeline = [
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]

    const result = await databaseService.feedbacks.aggregate(pipeline).toArray()
    return result
  }

  // Lấy feedback gần đây cho dashboard
  async getRecentFeedbacks(limit: number = 5) {
    const feedbacks = await databaseService.feedbacks.find({}).sort({ created_at: -1 }).limit(limit).toArray()

    return feedbacks
  }
}

const feedbackService = new FeedbackService()
export default feedbackService
