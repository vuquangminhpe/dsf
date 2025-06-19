/**
 * Feedback system configuration
 */
export const FEEDBACK_CONFIG = {
  // ID của admin cố định quản lý tất cả feedback
  ADMIN_ID: '67fdd9abcbf252146e7d30ef',

  // Cấu hình khác
  DEFAULT_PRIORITY: 'medium',
  DEFAULT_STATUS: 'in_progress', // Tự động chuyển sang in_progress vì đã có admin
  MAX_MESSAGE_LENGTH: 2000,
  MAX_TITLE_LENGTH: 200,

  // Thống kê
  RECENT_FEEDBACKS_LIMIT: 10,
  TOP_TAGS_LIMIT: 20
} as const

export type FeedbackConfig = typeof FEEDBACK_CONFIG
export const FEEDBACK_MESSAGES = {
  CREATE_FEEDBACK_SUCCESS: 'Create feedback successfully',
  CREATE_FEEDBACK_FAILED: 'Create feedback failed',
  GET_FEEDBACKS_SUCCESS: 'Get feedbacks successfully',
  GET_FEEDBACKS_FAILED: 'Get feedbacks failed',
  GET_FEEDBACK_SUCCESS: 'Get feedback successfully',
  GET_FEEDBACK_FAILED: 'Get feedback failed',
  FEEDBACK_NOT_FOUND: 'Feedback not found',
  UPDATE_FEEDBACK_SUCCESS: 'Update feedback successfully',
  UPDATE_FEEDBACK_FAILED: 'Update feedback failed',
  ADD_MESSAGE_SUCCESS: 'Add message successfully',
  ADD_MESSAGE_FAILED: 'Add message failed',
  ASSIGN_FEEDBACK_SUCCESS: 'Assign feedback successfully',
  ASSIGN_FEEDBACK_FAILED: 'Assign feedback failed',
  RESOLVE_FEEDBACK_SUCCESS: 'Resolve feedback successfully',
  RESOLVE_FEEDBACK_FAILED: 'Resolve feedback failed',
  CLOSE_FEEDBACK_SUCCESS: 'Close feedback successfully',
  CLOSE_FEEDBACK_FAILED: 'Close feedback failed',
  DELETE_FEEDBACK_SUCCESS: 'Delete feedback successfully',
  DELETE_FEEDBACK_FAILED: 'Delete feedback failed',
  GET_FEEDBACK_STATS_SUCCESS: 'Get feedback statistics successfully',
  GET_FEEDBACK_STATS_FAILED: 'Get feedback statistics failed',
  GET_TOP_TAGS_SUCCESS: 'Get top tags successfully',
  GET_TOP_TAGS_FAILED: 'Get top tags failed',
  GET_RECENT_FEEDBACKS_SUCCESS: 'Get recent feedbacks successfully',
  GET_RECENT_FEEDBACKS_FAILED: 'Get recent feedbacks failed',
  PERMISSION_DENIED: 'Permission denied',
  ADMIN_ONLY: 'Admin permission required',
  TEACHER_ONLY: 'Teacher permission required',
  FEEDBACK_TITLE_REQUIRED: 'Feedback title is required',
  FEEDBACK_CATEGORY_REQUIRED: 'Feedback category is required',
  FEEDBACK_MESSAGE_REQUIRED: 'Feedback message is required',
  INVALID_FEEDBACK_STATUS: 'Invalid feedback status',
  INVALID_FEEDBACK_PRIORITY: 'Invalid feedback priority',
  INVALID_FEEDBACK_CATEGORY: 'Invalid feedback category',
  INVALID_ADMIN_ID: 'Invalid admin ID',
  FEEDBACK_ALREADY_RESOLVED: 'Feedback already resolved',
  FEEDBACK_ALREADY_CLOSED: 'Feedback already closed'
} as const
