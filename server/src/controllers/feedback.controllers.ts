import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { ObjectId } from 'mongodb'
import feedbackService from '../services/feedback.services'
import databaseService from '../services/database.services'
import {
  CreateFeedbackBody,
  UpdateFeedbackBody,
  AddMessageBody,
  AssignFeedbackBody,
  GetFeedbacksQuery,
  FeedbackStatsQuery
} from '../models/request/Feedback.request'
import { TokenPayload } from '../models/request/User.request'
import { FEEDBACK_MESSAGES } from '../constants/messages'
import HTTP_STATUS from '../constants/httpStatus'
import { FEEDBACK_CONFIG } from '../constants/feedback'

export const createFeedbackController = async (
  req: Request<ParamsDictionary, any, CreateFeedbackBody>,
  res: Response
) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload
    const result = await feedbackService.createFeedback(user_id, req.body)

    res.json({
      message: FEEDBACK_MESSAGES.CREATE_FEEDBACK_SUCCESS,
      result: {
        feedback_id: result.insertedId
      }
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.CREATE_FEEDBACK_FAILED
    })
  }
}

export const getFeedbacksController = async (
  req: Request<ParamsDictionary, any, any, GetFeedbacksQuery>,
  res: Response
) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload
    let query = req.query

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    // Nếu là giáo viên, chỉ lấy feedback của mình
    if (user.role === 'teacher') {
      query = { ...query, teacher_id: user_id }
    } // Nếu là admin, chỉ admin cố định mới thấy tất cả feedback
    else if (user.role === 'admin' && user_id !== FEEDBACK_CONFIG.ADMIN_ID) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Chỉ admin được ủy quyền mới có thể quản lý feedback'
      })
    }

    const result = await feedbackService.getFeedbacks(query)

    res.json({
      message: FEEDBACK_MESSAGES.GET_FEEDBACKS_SUCCESS,
      result
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.GET_FEEDBACKS_FAILED
    })
  }
}

export const getFeedbackByIdController = async (req: Request<{ feedback_id: string }>, res: Response) => {
  try {
    const { feedback_id } = req.params
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    const feedback = await feedbackService.getFeedbackById(feedback_id)

    if (!feedback) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND
      })
    }

    // Kiểm tra quyền xem feedback
    if (user.role === 'teacher' && feedback.teacher_id.toString() !== user_id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: FEEDBACK_MESSAGES.PERMISSION_DENIED
      })
    }

    res.json({
      message: FEEDBACK_MESSAGES.GET_FEEDBACK_SUCCESS,
      result: feedback
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.GET_FEEDBACK_FAILED
    })
  }
}

export const updateFeedbackController = async (
  req: Request<{ feedback_id: string }, any, UpdateFeedbackBody>,
  res: Response
) => {
  try {
    const { feedback_id } = req.params
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    const result = await feedbackService.updateFeedback(feedback_id, req.body, user_id, user.role || 'teacher')

    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND
      })
    }

    res.json({
      message: FEEDBACK_MESSAGES.UPDATE_FEEDBACK_SUCCESS,
      result
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Permission denied') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: FEEDBACK_MESSAGES.PERMISSION_DENIED
      })
    }

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.UPDATE_FEEDBACK_FAILED
    })
  }
}

export const addMessageController = async (
  req: Request<{ feedback_id: string }, any, AddMessageBody>,
  res: Response
) => {
  try {
    const { feedback_id } = req.params
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    const result = await feedbackService.addMessage(feedback_id, req.body, user_id, user.role as 'teacher' | 'admin')

    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND
      })
    }

    res.json({
      message: FEEDBACK_MESSAGES.ADD_MESSAGE_SUCCESS,
      result
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Permission denied') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: FEEDBACK_MESSAGES.PERMISSION_DENIED
      })
    }

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.ADD_MESSAGE_FAILED
    })
  }
}

export const assignFeedbackController = async (
  req: Request<{ feedback_id: string }, any, AssignFeedbackBody>,
  res: Response
) => {
  try {
    const { feedback_id } = req.params
    const { admin_id } = req.body
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    if (user.role !== 'admin' || user_id !== FEEDBACK_CONFIG.ADMIN_ID) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Chỉ admin được ủy quyền mới có thể thực hiện thao tác này'
      })
    }

    const result = await feedbackService.assignFeedback(feedback_id, admin_id)

    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND
      })
    }

    res.json({
      message: FEEDBACK_MESSAGES.ASSIGN_FEEDBACK_SUCCESS,
      result
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.ASSIGN_FEEDBACK_FAILED
    })
  }
}

export const resolveFeedbackController = async (req: Request<{ feedback_id: string }>, res: Response) => {
  try {
    const { feedback_id } = req.params
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    if (user.role !== 'admin' || user_id !== FEEDBACK_CONFIG.ADMIN_ID) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Chỉ admin được ủy quyền mới có thể thực hiện thao tác này'
      })
    }

    const result = await feedbackService.resolveFeedback(feedback_id)

    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND
      })
    }

    res.json({
      message: FEEDBACK_MESSAGES.RESOLVE_FEEDBACK_SUCCESS,
      result
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.RESOLVE_FEEDBACK_FAILED
    })
  }
}

export const closeFeedbackController = async (req: Request<{ feedback_id: string }>, res: Response) => {
  try {
    const { feedback_id } = req.params
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    if (user.role !== 'admin' || user_id !== FEEDBACK_CONFIG.ADMIN_ID) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Chỉ admin được ủy quyền mới có thể thực hiện thao tác này'
      })
    }

    const result = await feedbackService.closeFeedback(feedback_id)

    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND
      })
    }

    res.json({
      message: FEEDBACK_MESSAGES.CLOSE_FEEDBACK_SUCCESS,
      result
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.CLOSE_FEEDBACK_FAILED
    })
  }
}

export const deleteFeedbackController = async (req: Request<{ feedback_id: string }>, res: Response) => {
  try {
    const { feedback_id } = req.params
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    const result = await feedbackService.deleteFeedback(feedback_id, user_id, user.role || 'teacher')

    if (result.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: FEEDBACK_MESSAGES.FEEDBACK_NOT_FOUND
      })
    }

    res.json({
      message: FEEDBACK_MESSAGES.DELETE_FEEDBACK_SUCCESS
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Permission denied') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: FEEDBACK_MESSAGES.PERMISSION_DENIED
      })
    }

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.DELETE_FEEDBACK_FAILED
    })
  }
}

export const getFeedbackStatsController = async (
  req: Request<ParamsDictionary, any, any, FeedbackStatsQuery>,
  res: Response
) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload
    let query = req.query

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    // Nếu là giáo viên, chỉ lấy stats của feedback mình tạo
    if (user.role === 'teacher') {
      query = { ...query, teacher_id: user_id }
    }

    const result = await feedbackService.getFeedbackStats(query)

    res.json({
      message: FEEDBACK_MESSAGES.GET_FEEDBACK_STATS_SUCCESS,
      result
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.GET_FEEDBACK_STATS_FAILED
    })
  }
}

export const getTopTagsController = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const result = await feedbackService.getTopTags(limit)

    res.json({
      message: FEEDBACK_MESSAGES.GET_TOP_TAGS_SUCCESS,
      result
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.GET_TOP_TAGS_FAILED
    })
  }
}

export const getRecentFeedbacksController = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'User not found'
      })
    }

    if (user.role !== 'admin' || user_id !== FEEDBACK_CONFIG.ADMIN_ID) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Chỉ admin được ủy quyền mới có thể thực hiện thao tác này'
      })
    }

    const limit = parseInt(req.query.limit as string) || 5
    const result = await feedbackService.getRecentFeedbacks(limit)

    res.json({
      message: FEEDBACK_MESSAGES.GET_RECENT_FEEDBACKS_SUCCESS,
      result
    })
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : FEEDBACK_MESSAGES.GET_RECENT_FEEDBACKS_FAILED
    })
  }
}
