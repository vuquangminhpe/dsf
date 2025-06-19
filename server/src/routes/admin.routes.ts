import { Router } from 'express'
import {
  getUserStatisticsController,
  getContentStatisticsController,
  getAllTeachersController,
  getAllStudentsController,
  getAllMasterExamsController,
  deleteUserController,
  deleteMasterExamController,
  changeUserRoleController
} from '../controllers/admin.controllers'
import {
  getAllPaymentsController,
  updatePaymentStatusController,
  deletePaymentController,
  createPackageController,
  updatePackageController,
  deletePackageController,
  getPaymentStatisticsController
} from '../controllers/payment.controllers'
import { AccessTokenValidator, verifiedUserValidator } from '../middlewares/users.middlewares'
import { isAdminValidator } from '../middlewares/admin.middlewares'
import { wrapAsync } from '../utils/handler'

const adminRouter = Router()

// Apply middleware for all admin routes
adminRouter.use(AccessTokenValidator, verifiedUserValidator, isAdminValidator)

// Statistics
adminRouter.get('/statistics/users', wrapAsync(getUserStatisticsController))
adminRouter.get('/statistics/content', wrapAsync(getContentStatisticsController))
adminRouter.get('/statistics/payments', wrapAsync(getPaymentStatisticsController))

// User management
adminRouter.get('/teachers', wrapAsync(getAllTeachersController))
adminRouter.get('/students', wrapAsync(getAllStudentsController))
adminRouter.delete('/users/:user_id', wrapAsync(deleteUserController))
adminRouter.put('/users/:user_id/role', wrapAsync(changeUserRoleController))

// Exam management
adminRouter.get('/master-exams', wrapAsync(getAllMasterExamsController))
adminRouter.delete('/master-exams/:master_exam_id', wrapAsync(deleteMasterExamController))

// Payment management
adminRouter.get('/payments', wrapAsync(getAllPaymentsController))
adminRouter.put('/payments/:payment_id/status', wrapAsync(updatePaymentStatusController))
adminRouter.delete('/payments/:payment_id', wrapAsync(deletePaymentController))

// Package management
adminRouter.post('/packages', wrapAsync(createPackageController))
adminRouter.put('/packages/:package_id', wrapAsync(updatePackageController))
adminRouter.delete('/packages/:package_id', wrapAsync(deletePackageController))

export default adminRouter
