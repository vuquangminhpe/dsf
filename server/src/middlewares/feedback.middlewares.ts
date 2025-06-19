import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import { FeedbackStatus, FeedbackPriority, FeedbackCategory } from '../constants/enums'
import { FEEDBACK_MESSAGES } from '../constants/messages'
import { FEEDBACK_CONFIG } from '../constants/feedback'
import { validate } from '../utils/validation'
import { ObjectId } from 'mongodb'
import { TokenPayload } from '../models/request/User.request'
import { UserRole } from '../models/schemas/User.schema'
import { ErrorWithStatus } from '../models/Errors'
import HTTP_STATUS from '../constants/httpStatus'
import databaseService from '../services/database.services'

// Validate tạo feedback mới
export const createFeedbackValidator = validate(
  checkSchema({
    title: {
      notEmpty: {
        errorMessage: FEEDBACK_MESSAGES.FEEDBACK_TITLE_REQUIRED
      },
      isLength: {
        options: { min: 5, max: 200 },
        errorMessage: 'Feedback title must be between 5-200 characters'
      }
    },
    category: {
      notEmpty: {
        errorMessage: FEEDBACK_MESSAGES.FEEDBACK_CATEGORY_REQUIRED
      },
      isIn: {
        options: [Object.values(FeedbackCategory)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_CATEGORY
      }
    },
    message: {
      notEmpty: {
        errorMessage: FEEDBACK_MESSAGES.FEEDBACK_MESSAGE_REQUIRED
      },
      isLength: {
        options: { min: 10, max: 2000 },
        errorMessage: 'Feedback message must be between 10-2000 characters'
      }
    },
    priority: {
      optional: true,
      isIn: {
        options: [Object.values(FeedbackPriority)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_PRIORITY
      }
    },
    attachments: {
      optional: true,
      isArray: {
        errorMessage: 'Attachments must be an array'
      }
    },
    tags: {
      optional: true,
      isArray: {
        errorMessage: 'Tags must be an array'
      }
    }
  }, ['body'])
)

// Validate cập nhật feedback
export const updateFeedbackValidator = validate(
  checkSchema({
    feedback_id: {
      in: ['params'],
      isMongoId: {
        errorMessage: 'Invalid feedback ID'
      }
    },
    title: {
      optional: true,
      isLength: {
        options: { min: 5, max: 200 },
        errorMessage: 'Feedback title must be between 5-200 characters'
      }
    },
    category: {
      optional: true,
      isIn: {
        options: [Object.values(FeedbackCategory)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_CATEGORY
      }
    },
    priority: {
      optional: true,
      isIn: {
        options: [Object.values(FeedbackPriority)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_PRIORITY
      }
    },
    status: {
      optional: true,
      isIn: {
        options: [Object.values(FeedbackStatus)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_STATUS
      }
    },
    tags: {
      optional: true,
      isArray: {
        errorMessage: 'Tags must be an array'
      }
    }
  }, ['params', 'body'])
)

// Validate thêm message
export const addMessageValidator = validate(
  checkSchema({
    feedback_id: {
      in: ['params'],
      isMongoId: {
        errorMessage: 'Invalid feedback ID'
      }
    },
    message: {
      notEmpty: {
        errorMessage: FEEDBACK_MESSAGES.FEEDBACK_MESSAGE_REQUIRED
      },
      isLength: {
        options: { min: 1, max: 2000 },
        errorMessage: 'Message must be between 1-2000 characters'
      }
    },
    attachments: {
      optional: true,
      isArray: {
        errorMessage: 'Attachments must be an array'
      }
    }
  }, ['params', 'body'])
)

// Validate assign feedback
export const assignFeedbackValidator = validate(
  checkSchema({
    feedback_id: {
      in: ['params'],
      isMongoId: {
        errorMessage: 'Invalid feedback ID'
      }
    },
    admin_id: {
      isMongoId: {
        errorMessage: FEEDBACK_MESSAGES.INVALID_ADMIN_ID
      }
    }
  }, ['params', 'body'])
)

// Validate feedback ID parameter
export const feedbackIdValidator = validate(
  checkSchema({
    feedback_id: {
      in: ['params'],
      isMongoId: {
        errorMessage: 'Invalid feedback ID'
      }
    }
  }, ['params'])
)

// Validate get feedbacks query
export const getFeedbacksValidator = validate(
  checkSchema({
    page: {
      in: ['query'],
      optional: true,
      isInt: {
        options: { min: 1 },
        errorMessage: 'Page must be a positive integer'
      }
    },
    limit: {
      in: ['query'],
      optional: true,
      isInt: {
        options: { min: 1, max: 100 },
        errorMessage: 'Limit must be between 1-100'
      }
    },
    status: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [Object.values(FeedbackStatus)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_STATUS
      }
    },
    priority: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [Object.values(FeedbackPriority)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_PRIORITY
      }
    },
    category: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [Object.values(FeedbackCategory)],
        errorMessage: FEEDBACK_MESSAGES.INVALID_FEEDBACK_CATEGORY
      }
    },
    teacher_id: {
      in: ['query'],
      optional: true,
      isMongoId: {
        errorMessage: 'Invalid teacher ID'
      }
    },
    admin_id: {
      in: ['query'],
      optional: true,
      isMongoId: {
        errorMessage: 'Invalid admin ID'
      }
    },
    search: {
      in: ['query'],
      optional: true,
      isString: true,
      isLength: {
        options: { min: 2, max: 100 },
        errorMessage: 'Search must be between 2-100 characters'
      }
    },
    sort_by: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [['created_at', 'updated_at', 'priority']],
        errorMessage: 'Sort by must be one of: created_at, updated_at, priority'
      }
    },
    sort_order: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [['asc', 'desc']],
        errorMessage: 'Sort order must be asc or desc'
      }
    }
  }, ['query'])
)

// Validate feedback stats query
export const getFeedbackStatsValidator = validate(
  checkSchema({
    teacher_id: {
      in: ['query'],
      optional: true,
      isMongoId: {
        errorMessage: 'Invalid teacher ID'
      }
    },
    admin_id: {
      in: ['query'],
      optional: true,
      isMongoId: {
        errorMessage: 'Invalid admin ID'
      }
    },
    from_date: {
      in: ['query'],
      optional: true,
      isISO8601: {
        errorMessage: 'From date must be a valid ISO8601 date'
      }
    },
    to_date: {
      in: ['query'],
      optional: true,
      isISO8601: {
        errorMessage: 'To date must be a valid ISO8601 date'
      }
    }
  }, ['query'])
)

// Middleware kiểm tra quyền teacher
export const requireTeacherRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload
    
    if (!user_id) {
      return next(
        new ErrorWithStatus({
          message: 'Authentication required',
          status: HTTP_STATUS.UNAUTHORIZED
        })
      )
    }

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

    if (!user) {
      return next(
        new ErrorWithStatus({
          message: 'User not found',
          status: HTTP_STATUS.NOT_FOUND
        })
      )
    }

    if (user.role !== UserRole.Teacher && user.role !== UserRole.Admin) {
      return next(
        new ErrorWithStatus({
          message: FEEDBACK_MESSAGES.TEACHER_ONLY,
          status: HTTP_STATUS.FORBIDDEN
        })
      )
    }

    next()
  } catch (error) {
    next(
      new ErrorWithStatus({
        message: 'Failed to verify teacher permissions',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    )
  }
}

// Middleware kiểm tra quyền admin (chỉ admin cố định được phép)
export const requireAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload
    
    if (!user_id) {
      return next(
        new ErrorWithStatus({
          message: 'Authentication required',
          status: HTTP_STATUS.UNAUTHORIZED
        })
      )
    }    // Kiểm tra xem có phải admin cố định không
    if (user_id !== FEEDBACK_CONFIG.ADMIN_ID) {
      return next(
        new ErrorWithStatus({
          message: 'Chỉ admin được ủy quyền mới có thể thực hiện thao tác này',
          status: HTTP_STATUS.FORBIDDEN
        })
      )
    }

    // Get user from database to check role
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

    if (!user) {
      return next(
        new ErrorWithStatus({
          message: 'User not found',
          status: HTTP_STATUS.NOT_FOUND
        })
      )
    }

    if (user.role !== UserRole.Admin) {
      return next(
        new ErrorWithStatus({
          message: FEEDBACK_MESSAGES.ADMIN_ONLY,
          status: HTTP_STATUS.FORBIDDEN
        })
      )
    }

    next()
  } catch (error) {
    next(
      new ErrorWithStatus({
        message: 'Failed to verify admin permissions',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    )
  }
}
