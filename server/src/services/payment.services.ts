import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import Payment, { PaymentStatus, PaymentMethod } from '../models/schemas/Payment.schema'
import PackagePrice, { PackageType } from '../models/schemas/PackagePriceType.schema'
import { UserRole } from '../models/schemas/User.schema'
import {
  CreatePaymentBody,
  GetPaymentsQuery,
  CreatePackageBody,
  UpdatePackageBody
} from '../models/request/Payment.request'

class PaymentService {
  // Get all available packages
  async getPackages() {
    const packages = await databaseService.packages.find({ active: true }).sort({ price: 1 }).toArray()
    return packages
  }

  // Initialize default packages
  async initializeDefaultPackages() {
    const existingPackages = await databaseService.packages.countDocuments()

    if (existingPackages === 0) {
      const defaultPackages = [
        new PackagePrice({
          name: 'Gói Đơn',
          type: PackageType.SINGLE,
          price: 200000,
          duration_months: 1,
          max_teachers: 1,
          question_generation_limit: 10,
          features: [
            'Được tạo và sử dụng Kỳ thi trong 1 tháng',
            'Tự động tạo câu hỏi giới hạn 10 lần',
            'Tất cả các chức năng hiện có trong web'
          ]
        } as any),
        new PackagePrice({
          name: 'Gói 3 Người',
          type: PackageType.TEAM_3,
          price: 100000,
          duration_months: 1,
          max_teachers: 3,
          question_generation_limit: 30,
          features: [
            'Dành cho 3 giáo viên',
            'Tự động tạo câu hỏi giới hạn 30 lần',
            'Chia sẻ tài nguyên giữa các giáo viên',
            'Tất cả các chức năng hiện có trong web'
          ]
        } as any),
        new PackagePrice({
          name: 'Gói 7 Người',
          type: PackageType.TEAM_7,
          price: 100000,
          duration_months: 1,
          max_teachers: 7,
          question_generation_limit: 300,
          features: [
            'Dành cho 7 giáo viên',
            'Tự động tạo câu hỏi giới hạn 300 lần',
            'Chia sẻ tài nguyên giữa các giáo viên',
            'Quản lý nhóm giáo viên',
            'Tất cả các chức năng hiện có trong web'
          ]
        } as any)
      ]

      await databaseService.packages.insertMany(defaultPackages)
    }
  }

  // Create payment
  async createPayment(userId: string, paymentData: CreatePaymentBody) {
    const { package_id, teacher_usernames, note } = paymentData

    // Get package details
    const packageInfo = await databaseService.packages.findOne({
      _id: new ObjectId(package_id),
      active: true
    })

    if (!packageInfo) {
      throw new Error('Package not found or inactive')
    }

    // Validate teacher usernames for team packages
    if (packageInfo.type !== PackageType.SINGLE && teacher_usernames) {
      if (teacher_usernames.length > packageInfo.max_teachers) {
        throw new Error(`Maximum ${packageInfo.max_teachers} teachers allowed for this package`)
      }

      // Validate all usernames exist and are teachers
      const teachers = await databaseService.users
        .find({
          username: { $in: teacher_usernames },
          role: UserRole.Teacher
        })
        .toArray()

      if (teachers.length !== teacher_usernames.length) {
        throw new Error('Some teacher usernames not found or not valid teachers')
      }
    }

    // Create payment
    const payment = new Payment({
      user_id: new ObjectId(userId),
      package_id: new ObjectId(package_id),
      package_type: packageInfo.type,
      amount: packageInfo.price,
      payment_method: PaymentMethod.QR_CODE,
      status: PaymentStatus.PENDING,
      teacher_usernames,
      qr_code_url: 'https://twitter-clone-minh-ap-southeast-1.s3.ap-southeast-1.amazonaws.com/QR.jpg',
      note,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    })

    const result = await databaseService.payments.insertOne(payment)
    return await databaseService.payments.findOne({ _id: result.insertedId })
  }

  // Get payments with filters
  async getPayments(query: GetPaymentsQuery) {
    const {
      page = '1',
      limit = '10',
      status,
      package_type,
      user_id,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
      from_date,
      to_date
    } = query

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Build filter
    const filter: any = {}

    if (status) {
      filter.status = status
    }

    if (package_type) {
      filter.package_type = package_type
    }

    if (user_id) {
      filter.user_id = new ObjectId(user_id)
    }

    if (from_date || to_date) {
      filter.created_at = {}
      if (from_date) filter.created_at.$gte = new Date(from_date)
      if (to_date) filter.created_at.$lte = new Date(to_date)
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                username: 1,
                email: 1
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'packages',
          localField: 'package_id',
          foreignField: '_id',
          as: 'package'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'processed_by',
          foreignField: '_id',
          as: 'processed_by_user',
          pipeline: [
            {
              $project: {
                name: 1,
                username: 1
              }
            }
          ]
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$package',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$processed_by_user',
          preserveNullAndEmptyArrays: true
        }
      }
    ]

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.username': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'package.name': { $regex: search, $options: 'i' } },
            { note: { $regex: search, $options: 'i' } }
          ]
        }
      })
    }

    // Add sorting
    const sortOrder = sort_order === 'asc' ? 1 : -1
    pipeline.push({ $sort: { [sort_by]: sortOrder } })

    // Get total count
    const totalPipeline = [...pipeline, { $count: 'total' }]
    const totalResult = await databaseService.payments.aggregate(totalPipeline).toArray()
    const total = totalResult.length > 0 ? totalResult[0].total : 0

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limitNum })

    const payments = await databaseService.payments.aggregate(pipeline).toArray()

    return {
      payments,
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum)
    }
  }

  // Get payment by ID
  async getPaymentById(paymentId: string) {
    const payment = await databaseService.payments
      .aggregate([
        { $match: { _id: new ObjectId(paymentId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  username: 1,
                  email: 1
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'packages',
            localField: 'package_id',
            foreignField: '_id',
            as: 'package'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $unwind: '$package'
        }
      ])
      .toArray()

    return payment[0] || null
  }

  // Update payment status (Admin only)
  async updatePaymentStatus(paymentId: string, status: PaymentStatus, adminId: string, adminNote?: string) {
    const updateData: any = {
      status,
      updated_at: new Date()
    }

    if (status === PaymentStatus.COMPLETED) {
      updateData.processed_by = new ObjectId(adminId)
      updateData.processed_at = new Date()
    }

    if (adminNote) {
      updateData.admin_note = adminNote
    }

    const result = await databaseService.payments.findOneAndUpdate(
      { _id: new ObjectId(paymentId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  }

  // Delete payment (Admin only)
  async deletePayment(paymentId: string) {
    const result = await databaseService.payments.deleteOne({ _id: new ObjectId(paymentId) })
    return result
  }

  // Package management methods
  async createPackage(packageData: CreatePackageBody) {
    const package_ = new PackagePrice(packageData as any)
    const result = await databaseService.packages.insertOne(package_)
    return await databaseService.packages.findOne({ _id: result.insertedId })
  }

  async updatePackage(packageId: string, updateData: UpdatePackageBody) {
    const result = await databaseService.packages.findOneAndUpdate(
      { _id: new ObjectId(packageId) },
      {
        $set: {
          ...updateData,
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  }

  async deletePackage(packageId: string) {
    // Check if package has any pending payments
    const pendingPayments = await databaseService.payments.countDocuments({
      package_id: new ObjectId(packageId),
      status: PaymentStatus.PENDING
    })

    if (pendingPayments > 0) {
      throw new Error('Cannot delete package with pending payments')
    }

    const result = await databaseService.packages.deleteOne({ _id: new ObjectId(packageId) })
    return result
  }

  // Get payment statistics
  async getPaymentStatistics() {
    const stats = await databaseService.payments
      .aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total_amount: { $sum: '$amount' }
          }
        }
      ])
      .toArray()

    const totalRevenue = await databaseService.payments
      .aggregate([
        {
          $match: { status: PaymentStatus.COMPLETED }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ])
      .toArray()

    const monthlyRevenue = await databaseService.payments
      .aggregate([
        {
          $match: {
            status: PaymentStatus.COMPLETED,
            created_at: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$created_at' },
              month: { $month: '$created_at' }
            },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ])
      .toArray()

    return {
      by_status: stats,
      total_revenue: totalRevenue[0]?.total || 0,
      monthly_revenue: monthlyRevenue
    }
  }
}

const paymentService = new PaymentService()
export default paymentService
