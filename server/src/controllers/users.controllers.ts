import { NextFunction, Request, Response } from 'express'
import usersService from '../services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  ChangePasswordReqBody,
  FollowReqBody,
  ForgotPasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  UpdateMeReqBody,
  UserProfileReqBody,
  VerifyEmailReqBody,
  VerifyForgotPasswordReqBody
} from '../models/request/User.request'
import { USERS_MESSAGES } from '../constants/messages'
import { ObjectId } from 'bson'
import User, { UserRole } from '../models/schemas/User.schema'
import databaseService from '../services/database.services'
import HTTP_STATUS from '../constants/httpStatus'
import { WithId } from 'mongodb'
import { UserVerifyStatus } from '../constants/enums'
import { pick } from 'lodash'
import { hashPassword, verifyPassword } from '../utils/crypto'
import { config } from 'dotenv'
import { envConfig } from '../constants/config'
import faceEmbeddingServices from '~/services/faceEmbedding.services'
import multer from 'multer'
config()
export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const user = req.user as User
  const user_id = user._id as ObjectId

  const result = await usersService.login({ user_id: user_id.toString(), verify: UserVerifyStatus.Verified })
  res.status(200).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result: {
      access_token: result,
      user
    }
  })
}
export const oauthController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const { code } = req.query
  const result = await usersService.oauth(code as string)
  const urlRedirect = `${envConfig.client_redirect}?access_token=${result.access_token}&new_user=${result.newUser}&verify=${result.verify}`
  res.redirect(urlRedirect)
  res.status(200).json({
    message: result.newUser ? USERS_MESSAGES.REGISTER_SUCCESS : USERS_MESSAGES.LOGIN_SUCCESS,
    result: {
      access_token: result.access_token
    }
  })
}
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  await usersService.register(req.body)

  res.json({
    message: USERS_MESSAGES.REGISTER_SUCCESS
  })
}

export const searchUsersByNameController = async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    if (!name) {
      res.status(400).json({
        message: 'Name query parameter is required'
      })
      return
    }

    const result = await usersService.searchUsersByName(name, page, limit)
    res.json({
      message: 'Searched users successfully',
      result: {
        users: result.users,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    console.error('Error searching users:', error)
    res.status(500).json({
      message: 'Failed to search users',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    res.json({
      message: 'Fetched users successfully'
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  const { refresh_token } = req.body

  const result = await usersService.logout(refresh_token as string)

  res.json(result)
}
export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response
) => {
  const { user_id, verify } = req.decoded_refresh_token as TokenPayload
  const { refresh_token } = req.body
  const result = await usersService.refreshToken(user_id, verify, refresh_token)
  res.json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result: result
  })
}
export const emailVerifyController = async (req: Request<ParamsDictionary, any, VerifyEmailReqBody>, res: Response) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload

  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }

  if ((user as WithId<User>).email_verify_token === '') {
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }

  const result = await usersService.verifyEmail(user_id)
  res.json({
    message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS,
    result
  })
}
export const resendVerifyEmailController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }
  if (user?.verify === UserVerifyStatus.Verified) {
    res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }
  const result = await usersService.resendVerifyEmail(user_id)
  res.json(result)
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  const { _id, verify } = req.user as User
  const user = await databaseService.users.findOne({ _id: new ObjectId(_id) })

  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }

  const result = await usersService.forgotPassword({
    user_id: new ObjectId(_id).toString(),
    verify: verify as UserVerifyStatus
  })
  res.json(result)
}
export const VerifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordReqBody>,
  res: Response
) => {
  res.json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decode_forgot_password_token as TokenPayload
  const { password } = req.body
  const result = await usersService.resetPassword(new ObjectId(user_id).toString(), password)
  res.json({ message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS, result })
}

export const getMeController = async (req: Request<ParamsDictionary, any, ResetPasswordReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const user = await usersService.getMe(user_id)
  res.json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result: user
  })
}

export const updateMeController = async (req: Request<ParamsDictionary, any, UpdateMeReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const body = pick(req.body, [
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'username',
    'avatar',
    'cover_photo'
  ])
  const user = await usersService.updateMe(user_id, body)
  res.json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    result: user
  })
}

export const getProfileByUserNameController = async (
  req: Request<ParamsDictionary, any, UserProfileReqBody>,
  res: Response
) => {
  const { username } = req.params

  const result = await usersService.getProfileByUserName(username)
  res.json(result)
}
export const getProfileByIdController = async (
  req: Request<ParamsDictionary, any, UserProfileReqBody>,
  res: Response
) => {
  const { user_id } = req.params

  const result = await usersService.getProfileByUserId(user_id)
  res.json(result)
}
export const followController = async (req: Request<ParamsDictionary, any, FollowReqBody>, res: Response) => {
  res.json('result')
}

export const UnController = async (req: Request<ParamsDictionary, any, FollowReqBody>, res: Response) => {
  res.json('')
}
export const getFollowingController = async (req: Request<ParamsDictionary, any, any>, res: Response) => {
  res.json({
    message: USERS_MESSAGES.GET_FOLLOWING_SUCCESSFULLY
  })
}
export const getFollowersController = async (req: Request<ParamsDictionary, any, any>, res: Response) => {
  res.json({
    message: USERS_MESSAGES.GET_FOLLOWERS_SUCCESSFULLY
  })
}
export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decode_authorization as TokenPayload

  const { old_password, new_password } = req.body
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

  const { password } = user as User
  const isVerifyPasswords = verifyPassword(old_password, password)
  if (isVerifyPasswords) {
    res.json({ message: USERS_MESSAGES.OLD_PASSWORD_IS_WRONG })
  }
  const result = await usersService.changePassword(user_id, new_password)
  res.json(result)
}

export const generateTextGeminiController = async (req: Request<ParamsDictionary, any, any>, res: Response) => {
  const { count } = req.body

  const result = await usersService.chatWithGemini(count)

  res.json({
    data: result
  })
}
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, JPG and PNG files are allowed'))
    }
  }
})

export const uploadStudentImageMiddleware = upload.single('face_image')

interface RegisterStudentRequest {
  name: string
  age: string | number
  gender: 'nam' | 'nữ'
  phone?: string
  class: string
  username: string
  password: string
  teacher_id: string
}

export const registerStudentController = async (
  req: Request<ParamsDictionary, any, RegisterStudentRequest>,
  res: Response
) => {
  try {
    console.log('🎓 Starting student registration by teacher...')

    // Get teacher info from token
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload

    // Validate teacher exists and has teacher role
    const teacher = await databaseService.users.findOne({
      _id: new ObjectId(teacher_id),
      role: UserRole.Teacher
    })

    if (!teacher) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Only teachers can register students'
      })
    }

    // Extract student data from request
    const { name, age, gender, phone, class: studentClass, username, password } = req.body

    // Validate required fields
    if (!name || !age || !gender || !studentClass || !username || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Missing required fields: name, age, gender, class, username, password'
      })
    }

    // Validate face image
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Face image is required for student registration'
      })
    }

    console.log(`👤 Registering student: ${name}, Class: ${studentClass}`)

    // Check if username already exists
    const existingUser = await databaseService.users.findOne({ username })
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        message: 'Username already exists'
      })
    }

    // Validate age
    const studentAge = typeof age === 'string' ? parseInt(age) : age
    if (isNaN(studentAge) || studentAge < 5 || studentAge > 25) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Invalid age. Age must be between 5 and 25'
      })
    }

    // Validate gender
    if (!['nam', 'nữ'].includes(gender)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Gender must be either "nam" or "nữ"'
      })
    }

    // Validate phone if provided
    if (phone && !/^[0-9]{10,11}$/.test(phone)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Invalid phone number format'
      })
    }

    // Create student user document
    const studentUser = {
      name: name.trim(),
      email: `${username}@student.school.edu.vn`, // Generate student email
      username: username.trim(),
      password: hashPassword(password),
      date_of_birth: new Date(new Date().getFullYear() - studentAge, 0, 1), // Approximate DOB
      verify: UserVerifyStatus.Verified, // Auto-verify teacher-created accounts
      role: 'student',
      class: studentClass,
      gender,
      age: studentAge,
      phone: phone || '',
      teacher_id: new ObjectId(teacher_id),
      bio: `Học sinh lớp ${studentClass}`,
      avatar: '', // Will be set after face processing
      cover_photo: '',
      location: '',
      website: '',
      typeAccount: 0,
      count_type_account: 0,
      email_verify_token: '',
      forgot_password_token: '',
      twitter_circle: [],
      is_online: false,
      last_active: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }

    console.log('💾 Creating student user account...')

    // Insert student user
    const insertResult = await databaseService.users.insertOne(studentUser as any)
    const student_id = insertResult.insertedId.toString()

    console.log(`✅ Student account created with ID: ${student_id}`)

    // Process face image and create embedding
    console.log('📸 Processing face image and creating embedding...')

    try {
      const faceEmbeddingSuccess = await faceEmbeddingServices.storeFaceEmbedding(student_id, req.file.buffer)

      if (!faceEmbeddingSuccess) {
        console.warn('⚠️ Face embedding creation failed, but student account created')
        // Don't fail the registration, just log the warning
      } else {
        console.log('✅ Face embedding created successfully')
      }
    } catch (faceError) {
      console.error('❌ Face processing error:', faceError)
      // Don't fail the registration, face can be added later
    }

    // Get the created student for response
    const createdStudent = await databaseService.users.findOne(
      { _id: new ObjectId(student_id) },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )

    console.log(`🎉 Student registration completed successfully: ${name}`)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Student registered successfully',
      result: {
        student: createdStudent,
        credentials: {
          username,
          password, // Return plain password for teacher to give to student
          login_url: process.env.CLIENT_URL || 'http://localhost:3000'
        },
        face_embedding_status: 'processed',
        teacher_info: {
          teacher_id,
          teacher_name: teacher.name
        }
      }
    })
  } catch (error: any) {
    console.error('❌ Student registration failed:', error)

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to register student',
      error: error.message || 'Unknown error occurred'
    })
  }
}

// Additional controller to get registered students by teacher
export const getTeacherStudentsController = async (req: Request, res: Response) => {
  try {
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const class_filter = req.query.class as string

    // Validate teacher
    const teacher = await databaseService.users.findOne({
      _id: new ObjectId(teacher_id),
      role: UserRole.Teacher
    })

    if (!teacher) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Only teachers can view student lists'
      })
    }

    // Build query
    const query: any = {
      teacher_id: new ObjectId(teacher_id),
      role: 'student'
    }

    if (class_filter) {
      query.class = class_filter
    }

    // Get students with pagination
    const skip = (page - 1) * limit

    const [students, total] = await Promise.all([
      databaseService.users
        .find(query, {
          projection: {
            password: 0,
            email_verify_token: 0,
            forgot_password_token: 0
          }
        })
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 })
        .toArray(),

      databaseService.users.countDocuments(query)
    ])

    // Get face embedding status for each student
    const studentsWithFaceStatus = await Promise.all(
      students.map(async (student) => {
        const faceEmbedding = await databaseService.db.collection('face_embeddings').findOne({ user_id: student._id })

        return {
          ...student,
          has_face_profile: !!faceEmbedding,
          face_created_at: faceEmbedding?.created_at || null
        }
      })
    )

    res.json({
      message: 'Students retrieved successfully',
      result: {
        students: studentsWithFaceStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        teacher_info: {
          teacher_id,
          teacher_name: teacher.name
        }
      }
    })
  } catch (error: any) {
    console.error('Error getting teacher students:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get students',
      error: error.message
    })
  }
}

// Bulk register students controller
export const bulkRegisterStudentsController = async (req: Request, res: Response) => {
  try {
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const { students, class: defaultClass } = req.body

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Students array is required and cannot be empty'
      })
    }

    // Validate teacher
    const teacher = await databaseService.users.findOne({
      _id: new ObjectId(teacher_id),
      role: UserRole.Teacher
    })

    if (!teacher) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: 'Only teachers can register students'
      })
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[]
    }

    console.log(`📚 Bulk registering ${students.length} students for teacher ${teacher.name}`)

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i]

      try {
        const { name, age, gender, phone, class: studentClass, username, password } = studentData

        // Validate required fields
        if (!name || !age || !gender || !username || !password) {
          throw new Error('Missing required fields')
        }

        // Check if username already exists
        const existingUser = await databaseService.users.findOne({ username })
        if (existingUser) {
          throw new Error('Username already exists')
        }

        // Create student user document
        const studentUser = {
          name: name.trim(),
          email: `${username}@student.school.edu.vn`,
          username: username.trim(),
          password: hashPassword(password),
          date_of_birth: new Date(new Date().getFullYear() - parseInt(age), 0, 1),
          verify: UserVerifyStatus.Verified,
          role: 'student',
          class: studentClass || defaultClass,
          gender,
          age: parseInt(age),
          phone: phone || '',
          teacher_id: new ObjectId(teacher_id),
          bio: `Học sinh lớp ${studentClass || defaultClass}`,
          avatar: '',
          cover_photo: '',
          location: '',
          website: '',
          typeAccount: 0,
          count_type_account: 0,
          email_verify_token: '',
          forgot_password_token: '',
          twitter_circle: [],
          is_online: false,
          last_active: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }

        // Insert student
        const insertResult = await databaseService.users.insertOne(studentUser as any)

        results.successful.push({
          index: i,
          student_id: insertResult.insertedId.toString(),
          name,
          username,
          class: studentClass || defaultClass
        })

        console.log(`✅ Student ${i + 1}/${students.length} registered: ${name}`)
      } catch (error: any) {
        results.failed.push({
          index: i,
          name: studentData.name || 'Unknown',
          username: studentData.username || 'Unknown',
          error: error.message
        })

        console.log(`❌ Student ${i + 1}/${students.length} failed: ${error.message}`)
      }
    }

    const response = {
      message: `Bulk registration completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      result: {
        summary: {
          total_students: students.length,
          successful_count: results.successful.length,
          failed_count: results.failed.length,
          success_rate: Math.round((results.successful.length / students.length) * 100)
        },
        successful_registrations: results.successful,
        failed_registrations: results.failed,
        teacher_info: {
          teacher_id,
          teacher_name: teacher.name
        }
      }
    }

    const statusCode = results.failed.length === 0 ? HTTP_STATUS.CREATED : HTTP_STATUS.PARTIAL_CONTENT
    res.status(statusCode).json(response)
  } catch (error: any) {
    console.error('Bulk registration error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Bulk registration failed',
      error: error.message
    })
  }
}
