import { Router } from 'express'
import {
  createFeedbackController,
  getFeedbacksController,
  getFeedbackByIdController,
  updateFeedbackController,
  addMessageController,
  assignFeedbackController,
  resolveFeedbackController,
  closeFeedbackController,
  deleteFeedbackController,
  getFeedbackStatsController,
  getTopTagsController,
  getRecentFeedbacksController
} from '../controllers/feedback.controllers'

import {
  createFeedbackValidator,
  updateFeedbackValidator,
  addMessageValidator,
  assignFeedbackValidator,
  feedbackIdValidator,
  getFeedbacksValidator,
  getFeedbackStatsValidator,
  requireTeacherRole,
  requireAdminRole
} from '../middlewares/feedback.middlewares'

import { AccessTokenValidator } from '../middlewares/users.middlewares'
import { wrapAsync } from '../utils/handler'

const feedbackRouter = Router()

/**
 * Description: Create a new feedback (Teacher only)
 * Path: /
 * Method: POST
 * Body: CreateFeedbackBody
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.post(
  '/',
  AccessTokenValidator,
  requireTeacherRole,
  createFeedbackValidator,
  wrapAsync(createFeedbackController)
)

/**
 * Description: Get feedbacks with pagination and filters
 * Path: /
 * Method: GET
 * Query: GetFeedbacksQuery
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.get(
  '/',
  AccessTokenValidator,
  getFeedbacksValidator,
  wrapAsync(getFeedbacksController)
)


/**
 * Description: Get feedback statistics
 * Path: /stats
 * Method: GET
 * Query: FeedbackStatsQuery
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.get(
  '/stats',
  AccessTokenValidator,
  getFeedbackStatsValidator,
  wrapAsync(getFeedbackStatsController)
)

/**
 * Description: Get top tags
 * Path: /tags/top
 * Method: GET
 * Query: { limit?: number }
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.get(
  '/tags/top',
  AccessTokenValidator,
  wrapAsync(getTopTagsController)
)

/**
 * Description: Get recent feedbacks (Admin only)
 * Path: /recent
 * Method: GET
 * Query: { limit?: number }
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.get(
  '/recent',
  AccessTokenValidator,
  requireAdminRole,
  wrapAsync(getRecentFeedbacksController)
)

/**
 * Description: Get feedback by ID
 * Path: /:feedback_id
 * Method: GET
 * Params: { feedback_id: string }
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.get(
  '/:feedback_id',
  AccessTokenValidator,
  feedbackIdValidator,
  wrapAsync(getFeedbackByIdController)
)

/**
 * Description: Update feedback
 * Path: /:feedback_id
 * Method: PATCH
 * Params: { feedback_id: string }
 * Body: UpdateFeedbackBody
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.patch(
  '/:feedback_id',
  AccessTokenValidator,
  updateFeedbackValidator,
  wrapAsync(updateFeedbackController)
)

/**
 * Description: Add message to feedback
 * Path: /:feedback_id/messages
 * Method: POST
 * Params: { feedback_id: string }
 * Body: AddMessageBody
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.post(
  '/:feedback_id/messages',
  AccessTokenValidator,
  addMessageValidator,
  wrapAsync(addMessageController)
)

/**
 * Description: Assign feedback to admin (Admin only)
 * Path: /:feedback_id/assign
 * Method: POST
 * Params: { feedback_id: string }
 * Body: AssignFeedbackBody
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.post(
  '/:feedback_id/assign',
  AccessTokenValidator,
  requireAdminRole,
  assignFeedbackValidator,
  wrapAsync(assignFeedbackController)
)

/**
 * Description: Resolve feedback (Admin only)
 * Path: /:feedback_id/resolve
 * Method: PATCH
 * Params: { feedback_id: string }
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.patch(
  '/:feedback_id/resolve',
  AccessTokenValidator,
  requireAdminRole,
  feedbackIdValidator,
  wrapAsync(resolveFeedbackController)
)

/**
 * Description: Close feedback (Admin only)
 * Path: /:feedback_id/close
 * Method: PATCH
 * Params: { feedback_id: string }
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.patch(
  '/:feedback_id/close',
  AccessTokenValidator,
  requireAdminRole,
  feedbackIdValidator,
  wrapAsync(closeFeedbackController)
)

/**
 * Description: Delete feedback
 * Path: /:feedback_id
 * Method: DELETE
 * Params: { feedback_id: string }
 * Header: { Authorization: Bearer <access_token> }
 */
feedbackRouter.delete(
  '/:feedback_id',
  AccessTokenValidator,
  feedbackIdValidator,
  wrapAsync(deleteFeedbackController)
)

export default feedbackRouter
