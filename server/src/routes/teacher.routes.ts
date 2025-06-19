import { Router } from 'express'
import {
  registerStudentController,
  getTeacherStudentsController,
  bulkRegisterStudentsController,
  uploadStudentImageMiddleware
} from '../controllers/users.controllers'
import { AccessTokenValidator, verifiedUserValidator } from '../middlewares/users.middlewares'
import { teacherRoleValidator } from '../middlewares/role.middlewares'
import { wrapAsync } from '../utils/handler'
import { body, query } from 'express-validator'
import databaseService from '~/services/database.services'
import { ObjectId } from 'mongodb'
import { UserRole } from '~/models/schemas/User.schema'
import faceEmbeddingServices from '~/services/faceEmbedding.services'

const teacherRouter = Router()

// All teacher routes require authentication and teacher role
teacherRouter.use(AccessTokenValidator, verifiedUserValidator, teacherRoleValidator)

/**
 * Register a single student
 * POST /teacher/register-student
 * Headers: Authorization: Bearer <teacher_access_token>
 * Body: form-data with:
 * - name: string (required)
 * - age: number (required)
 * - gender: "nam" | "nữ" (required)
 * - phone: string (optional)
 * - class: string (required)
 * - username: string (required)
 * - password: string (required)
 * - face_image: File (required)
 */
teacherRouter.post(
  '/register-student',
  uploadStudentImageMiddleware,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
      .withMessage('Name can only contain letters and spaces'),

    body('age').isInt({ min: 5, max: 25 }).withMessage('Age must be between 5 and 25'),

    body('gender').isIn(['nam', 'nữ']).withMessage('Gender must be either "nam" or "nữ"'),

    body('phone')
      .optional()
      .matches(/^[0-9]{10,11}$/)
      .withMessage('Phone must be 10-11 digits'),

    body('class').trim().isLength({ min: 1, max: 10 }).withMessage('Class is required and max 10 characters'),

    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9._]+$/)
      .withMessage('Username can only contain letters, numbers, dots and underscores'),

    body('password').isLength({ min: 6, max: 50 }).withMessage('Password must be between 6 and 50 characters')
  ],
  wrapAsync(registerStudentController)
)

/**
 * Get students registered by teacher
 * GET /teacher/students
 * Headers: Authorization: Bearer <teacher_access_token>
 * Query:
 * - page?: number (default: 1)
 * - limit?: number (default: 10)
 * - class?: string (filter by class)
 */
teacherRouter.get(
  '/students',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    query('class').optional().trim().isLength({ max: 10 }).withMessage('Class filter max 10 characters')
  ],
  wrapAsync(getTeacherStudentsController)
)

/**
 * Bulk register students (without face images)
 * POST /teacher/bulk-register
 * Headers: Authorization: Bearer <teacher_access_token>
 * Body: {
 *   class?: string (default class for all students),
 *   students: Array<{
 *     name: string,
 *     age: number,
 *     gender: "nam" | "nữ",
 *     phone?: string,
 *     class?: string,
 *     username: string,
 *     password: string
 *   }>
 * }
 */
teacherRouter.post(
  '/bulk-register',
  [
    body('class').optional().trim().isLength({ min: 1, max: 10 }).withMessage('Default class max 10 characters'),

    body('students').isArray({ min: 1, max: 50 }).withMessage('Students must be an array with 1-50 items'),

    body('students.*.name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Each student name must be between 2-100 characters'),

    body('students.*.age').isInt({ min: 5, max: 25 }).withMessage('Each student age must be between 5-25'),

    body('students.*.gender').isIn(['nam', 'nữ']).withMessage('Each student gender must be "nam" or "nữ"'),

    body('students.*.username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Each username must be between 3-30 characters')
      .matches(/^[a-zA-Z0-9._]+$/)
      .withMessage('Each username can only contain letters, numbers, dots and underscores'),

    body('students.*.password')
      .isLength({ min: 6, max: 50 })
      .withMessage('Each password must be between 6-50 characters')
  ],
  wrapAsync(bulkRegisterStudentsController)
)

/**
 * Update student face image
 * PUT /teacher/student/:student_id/face
 * Headers: Authorization: Bearer <teacher_access_token>
 * Body: form-data with face_image file
 */
teacherRouter.put(
  '/student/:student_id/face',
  uploadStudentImageMiddleware,
  wrapAsync(
    async (
      req: { params: { student_id: any }; decode_authorization: any; file: { buffer: any } },
      res: {
        status: (arg0: number) => {
          (): any
          new (): any
          json: { (arg0: { message: string; error?: any }): void; new (): any }
        }
        json: (arg0: {
          message: string
          result: { student_id: any; student_name: string; face_updated_at: Date }
        }) => void
      }
    ) => {
      try {
        const { student_id } = req.params
        const { user_id: teacher_id } = req.decode_authorization as any

        if (!req.file) {
          return res.status(400).json({
            message: 'Face image is required'
          })
        }

        // Verify student belongs to teacher
        const student = await databaseService.users.findOne({
          _id: new ObjectId(student_id),
          teacher_id: new ObjectId(teacher_id),
          role: UserRole.Teacher
        })

        if (!student) {
          return res.status(404).json({
            message: 'Student not found or not registered by you'
          })
        }

        // Process face image
        const success = await faceEmbeddingServices.storeFaceEmbedding(student_id, req.file.buffer)

        if (!success) {
          return res.status(400).json({
            message: 'Failed to process face image'
          })
        }

        res.json({
          message: 'Student face image updated successfully',
          result: {
            student_id,
            student_name: student.name,
            face_updated_at: new Date()
          }
        })
      } catch (error: any) {
        console.error('Error updating student face:', error)
        res.status(500).json({
          message: 'Failed to update student face image',
          error: error.message
        })
      }
    }
  )
)

/**
 * Delete student (teacher can delete their own registered students)
 * DELETE /teacher/student/:student_id
 * Headers: Authorization: Bearer <teacher_access_token>
 */
teacherRouter.delete(
  '/student/:student_id',
  wrapAsync(
    async (
      req: { params: { student_id: any }; decode_authorization: any },
      res: {
        status: (arg0: number) => {
          (): any
          new (): any
          json: { (arg0: { message: string; error?: any }): void; new (): any }
        }
        json: (arg0: {
          message: string
          result: { deleted_student: { id: any; name: string; username: string | undefined } }
        }) => void
      }
    ) => {
      try {
        const { student_id } = req.params
        const { user_id: teacher_id } = req.decode_authorization as any

        // Verify student belongs to teacher
        const student = await databaseService.users.findOne({
          _id: new ObjectId(student_id),
          teacher_id: new ObjectId(teacher_id),
          role: UserRole.Teacher
        })

        if (!student) {
          return res.status(404).json({
            message: 'Student not found or not registered by you'
          })
        }

        // Delete student account
        await databaseService.users.deleteOne({
          _id: new ObjectId(student_id)
        })

        // Delete face embedding if exists
        await databaseService.db.collection('face_embeddings').deleteOne({
          user_id: new ObjectId(student_id)
        })

        // Delete any exam sessions
        await databaseService.examSessions.deleteMany({
          student_id: new ObjectId(student_id)
        })

        res.json({
          message: 'Student deleted successfully',
          result: {
            deleted_student: {
              id: student_id,
              name: student.name,
              username: student.username
            }
          }
        })
      } catch (error: any) {
        console.error('Error deleting student:', error)
        res.status(500).json({
          message: 'Failed to delete student',
          error: error.message
        })
      }
    }
  )
)

export default teacherRouter
