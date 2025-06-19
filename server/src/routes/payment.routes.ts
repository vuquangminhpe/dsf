import { Router } from 'express'
import {
  getPackagesController,
  createPaymentController,
  getUserPaymentsController,
  getPaymentByIdController,
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

const paymentRouter = Router()

// Public routes - no authentication required
paymentRouter.get('/packages', wrapAsync(getPackagesController))

// User routes - authentication required
paymentRouter.use(AccessTokenValidator, verifiedUserValidator)

// User payment operations
paymentRouter.post('/', wrapAsync(createPaymentController))
paymentRouter.get('/my-payments', wrapAsync(getUserPaymentsController))
paymentRouter.get('/:payment_id', wrapAsync(getPaymentByIdController))

// Admin routes - admin authentication required
paymentRouter.use(isAdminValidator)

// Admin payment management
paymentRouter.get('/admin/all', wrapAsync(getAllPaymentsController))
paymentRouter.put('/admin/:payment_id/status', wrapAsync(updatePaymentStatusController))
paymentRouter.delete('/admin/:payment_id', wrapAsync(deletePaymentController))
paymentRouter.get('/admin/statistics', wrapAsync(getPaymentStatisticsController))

// Admin package management
paymentRouter.post('/admin/packages', wrapAsync(createPackageController))
paymentRouter.put('/admin/packages/:package_id', wrapAsync(updatePackageController))
paymentRouter.delete('/admin/packages/:package_id', wrapAsync(deletePackageController))

export default paymentRouter
