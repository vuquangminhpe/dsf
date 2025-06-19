import { Request, Response } from 'express'
import paymentService from '../services/payment.services'
import HTTP_STATUS from '../constants/httpStatus'
import { PAYMENT_MESSAGE } from '../constants/messages'
import {
  CreatePaymentBody,
  UpdatePaymentStatusBody,
  GetPaymentsQuery,
  CreatePackageBody,
  UpdatePackageBody
} from '../models/request/Payment.request'
import { TokenPayload } from '../models/request/User.request'

// Public APIs
export const getPackagesController = async (req: Request, res: Response) => {
  try {
    // Initialize default packages if not exists
    await paymentService.initializeDefaultPackages()

    const packages = await paymentService.getPackages()

    res.json({
      message: 'Get packages successfully',
      result: packages
    })
  } catch (error) {
    console.error('Error getting packages:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get packages',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// User APIs
export const createPaymentController = async (req: Request<any, any, CreatePaymentBody>, res: Response) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload
    const payment = await paymentService.createPayment(user_id, req.body)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Payment created successfully',
      result: payment
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    const statusCode =
      error instanceof Error && error.message.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : error instanceof Error && error.message.includes('Maximum')
          ? HTTP_STATUS.BAD_REQUEST
          : HTTP_STATUS.INTERNAL_SERVER_ERROR

    res.status(statusCode).json({
      message: PAYMENT_MESSAGE.PAYMENT_FAILED,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getUserPaymentsController = async (req: Request<any, any, any, GetPaymentsQuery>, res: Response) => {
  try {
    const { user_id } = req.decode_authorization as TokenPayload

    // Add user_id filter for non-admin users
    const query = { ...req.query, user_id }

    const result = await paymentService.getPayments(query)

    res.json({
      message: 'Get user payments successfully',
      result
    })
  } catch (error) {
    console.error('Error getting user payments:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get user payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getPaymentByIdController = async (req: Request, res: Response) => {
  try {
    const { payment_id } = req.params
    const { user_id } = req.decode_authorization as TokenPayload

    const payment = await paymentService.getPaymentById(payment_id)

    if (!payment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: PAYMENT_MESSAGE.PAYMENT_NOT_FOUND
      })
    }

    // Check if user owns this payment (non-admin users)
    if (payment.user_id.toString() !== user_id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Access denied'
      })
    }

    res.json({
      message: 'Get payment successfully',
      result: payment
    })
  } catch (error) {
    console.error('Error getting payment:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Admin APIs
export const getAllPaymentsController = async (req: Request<any, any, any, GetPaymentsQuery>, res: Response) => {
  try {
    const result = await paymentService.getPayments(req.query)

    res.json({
      message: 'Get all payments successfully',
      result
    })
  } catch (error) {
    console.error('Error getting all payments:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const updatePaymentStatusController = async (req: Request<any, any, UpdatePaymentStatusBody>, res: Response) => {
  try {
    const { payment_id } = req.params
    const { status, admin_note } = req.body
    const { user_id } = req.decode_authorization as TokenPayload

    const payment = await paymentService.updatePaymentStatus(payment_id, status, user_id, admin_note)

    if (!payment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: PAYMENT_MESSAGE.PAYMENT_NOT_FOUND
      })
    }

    res.json({
      message: 'Payment status updated successfully',
      result: payment
    })
  } catch (error) {
    console.error('Error updating payment status:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update payment status',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const deletePaymentController = async (req: Request, res: Response) => {
  try {
    const { payment_id } = req.params

    const result = await paymentService.deletePayment(payment_id)

    if (result.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: PAYMENT_MESSAGE.PAYMENT_NOT_FOUND
      })
    }

    res.json({
      message: 'Payment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to delete payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Package management APIs (Admin only)
export const createPackageController = async (req: Request<any, any, CreatePackageBody>, res: Response) => {
  try {
    const package_ = await paymentService.createPackage(req.body)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Package created successfully',
      result: package_
    })
  } catch (error) {
    console.error('Error creating package:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to create package',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const updatePackageController = async (req: Request<any, any, UpdatePackageBody>, res: Response) => {
  try {
    const { package_id } = req.params
    const package_ = await paymentService.updatePackage(package_id, req.body)

    if (!package_) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Package not found'
      })
    }

    res.json({
      message: 'Package updated successfully',
      result: package_
    })
  } catch (error) {
    console.error('Error updating package:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update package',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const deletePackageController = async (req: Request, res: Response) => {
  try {
    const { package_id } = req.params

    const result = await paymentService.deletePackage(package_id)

    if (result.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Package not found'
      })
    }

    res.json({
      message: 'Package deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting package:', error)
    const statusCode =
      error instanceof Error && error.message.includes('pending payments')
        ? HTTP_STATUS.BAD_REQUEST
        : HTTP_STATUS.INTERNAL_SERVER_ERROR

    res.status(statusCode).json({
      message: 'Failed to delete package',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getPaymentStatisticsController = async (req: Request, res: Response) => {
  try {
    const statistics = await paymentService.getPaymentStatistics()

    res.json({
      message: 'Get payment statistics successfully',
      result: statistics
    })
  } catch (error) {
    console.error('Error getting payment statistics:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get payment statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
