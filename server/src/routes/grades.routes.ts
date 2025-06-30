import { Router } from 'express'
import {
  getClassGradesController,
  updateBulkGradesController,
  getSubjectsController,
  getCommentsController,
  createGradeController,
  getStudentGradesController
} from '../controllers/grades.controllers'
import { AccessTokenValidator, verifiedUserValidator } from '../middlewares/users.middlewares'
import {
  getClassGradesValidator,
  updateBulkGradesValidator,
  createGradeValidator
} from '../middlewares/grades.middlewares'
import { wrapAsync } from '../utils/handler'

const gradesRouter = Router()

/**
 * Lấy danh sách môn học theo cấp học
 * GET /api/grades/subjects?grade_level=middle_school
 */
gradesRouter.get('/subjects', wrapAsync(getSubjectsController))

/**
 * Lấy dữ liệu bảng điểm của lớp
 * GET /api/grades/class/:className?subject_id=...&semester=1&school_year=2024-2025
 */
gradesRouter.get(
  '/class/:className',
  AccessTokenValidator,
  verifiedUserValidator,
  getClassGradesValidator,
  wrapAsync(getClassGradesController)
)

/**
 * Lấy điểm của một học sinh cụ thể
 * GET /api/grades/student/:student_id?subject_id=...&semester=1&school_year=2024-2025
 */
gradesRouter.get(
  '/student/:student_id',
  AccessTokenValidator,
  verifiedUserValidator,
  wrapAsync(getStudentGradesController)
)

/**
 * Lấy thư viện nhận xét đã được lọc
 * GET /api/grades/comments?category=GOOD&type=STRENGTH&grade_level=middle_school
 */
gradesRouter.get('/comments', wrapAsync(getCommentsController))

/**
 * Tạo/cập nhật điểm cho học sinh
 * POST /api/grades
 */
gradesRouter.post(
  '/',
  AccessTokenValidator,
  verifiedUserValidator,
  createGradeValidator,
  wrapAsync(createGradeController)
)

/**
 * Cập nhật hàng loạt điểm và nhận xét cho cả lớp
 * PUT /api/grades/bulk-update
 */
gradesRouter.put(
  '/bulk-update',
  AccessTokenValidator,
  verifiedUserValidator,
  updateBulkGradesValidator,
  wrapAsync(updateBulkGradesController)
)

export default gradesRouter

// server/src/controllers/grades.controllers.ts
import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import gradesService from '../services/grades.services'
import { TokenPayload } from '../models/request/User.request'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '../constants/httpStatus'

export const getSubjectsController = async (req: Request, res: Response) => {
  try {
    const { grade_level } = req.query
    const subjects = await gradesService.getSubjects(grade_level as string)

    res.json({
      message: 'Lấy danh sách môn học thành công',
      result: subjects
    })
  } catch (error) {
    console.error('Error getting subjects:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi lấy danh sách môn học',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getClassGradesController = async (req: Request, res: Response) => {
  try {
    const { className } = req.params
    const { subject_id, semester, school_year } = req.query
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload

    const result = await gradesService.getClassGrades({
      className,
      subject_id: subject_id as string,
      semester: parseInt(semester as string),
      school_year: school_year as string,
      teacher_id
    })

    res.json({
      message: 'Lấy dữ liệu bảng điểm thành công',
      result
    })
  } catch (error) {
    console.error('Error getting class grades:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi lấy dữ liệu bảng điểm',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getStudentGradesController = async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params
    const { subject_id, semester, school_year } = req.query

    const result = await gradesService.getStudentGrades({
      student_id,
      subject_id: subject_id as string,
      semester: parseInt(semester as string),
      school_year: school_year as string
    })

    res.json({
      message: 'Lấy điểm học sinh thành công',
      result
    })
  } catch (error) {
    console.error('Error getting student grades:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi lấy điểm học sinh',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getCommentsController = async (req: Request, res: Response) => {
  try {
    const { category, type, grade_level } = req.query
    const comments = await gradesService.getComments({
      category: category as string,
      type: type as string,
      grade_level: grade_level as string
    })

    res.json({
      message: 'Lấy thư viện nhận xét thành công',
      result: comments
    })
  } catch (error) {
    console.error('Error getting comments:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi lấy thư viện nhận xét',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const createGradeController = async (req: Request, res: Response) => {
  try {
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const gradeData = { ...req.body, teacher_id: new ObjectId(teacher_id) }

    const result = await gradesService.createGrade(gradeData)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Tạo điểm thành công',
      result
    })
  } catch (error) {
    console.error('Error creating grade:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi tạo điểm',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const updateBulkGradesController = async (req: Request, res: Response) => {
  try {
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const { grades, comments, class_name, subject_id, semester, school_year } = req.body

    const result = await gradesService.updateBulkGrades({
      grades,
      comments,
      class_name,
      subject_id,
      semester,
      school_year,
      teacher_id
    })

    res.json({
      message: 'Cập nhật hàng loạt thành công',
      result
    })
  } catch (error) {
    console.error('Error bulk updating grades:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi cập nhật hàng loạt',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// server/src/middlewares/grades.middlewares.ts
import { checkSchema } from 'express-validator'
import { validate } from '../utils/validation'
import { ObjectId } from 'mongodb'

export const getClassGradesValidator = validate(
  checkSchema({
    className: {
      in: ['params'],
      notEmpty: {
        errorMessage: 'Tên lớp không được để trống'
      }
    },
    subject_id: {
      in: ['query'],
      notEmpty: {
        errorMessage: 'ID môn học không được để trống'
      },
      custom: {
        options: (value) => {
          if (!ObjectId.isValid(value)) {
            throw new Error('ID môn học không hợp lệ')
          }
          return true
        }
      }
    },
    semester: {
      in: ['query'],
      isInt: {
        options: { min: 1, max: 2 },
        errorMessage: 'Học kỳ phải là 1 hoặc 2'
      }
    },
    school_year: {
      in: ['query'],
      notEmpty: {
        errorMessage: 'Năm học không được để trống'
      },
      matches: {
        options: /^\d{4}-\d{4}$/,
        errorMessage: 'Năm học phải có định dạng YYYY-YYYY'
      }
    }
  })
)

export const createGradeValidator = validate(
  checkSchema({
    student_id: {
      notEmpty: {
        errorMessage: 'ID học sinh không được để trống'
      },
      custom: {
        options: (value) => {
          if (!ObjectId.isValid(value)) {
            throw new Error('ID học sinh không hợp lệ')
          }
          return true
        }
      }
    },
    subject_id: {
      notEmpty: {
        errorMessage: 'ID môn học không được để trống'
      },
      custom: {
        options: (value) => {
          if (!ObjectId.isValid(value)) {
            throw new Error('ID môn học không hợp lệ')
          }
          return true
        }
      }
    },
    score: {
      isFloat: {
        options: { min: 0, max: 10 },
        errorMessage: 'Điểm phải từ 0 đến 10'
      }
    },
    exam_type: {
      isIn: {
        options: [['TX', 'GK', 'CK']],
        errorMessage: 'Loại kiểm tra phải là TX, GK hoặc CK'
      }
    }
  })
)

export const updateBulkGradesValidator = validate(
  checkSchema({
    grades: {
      isArray: {
        errorMessage: 'Danh sách điểm phải là mảng'
      }
    },
    comments: {
      isArray: {
        errorMessage: 'Danh sách nhận xét phải là mảng'
      }
    },
    class_name: {
      notEmpty: {
        errorMessage: 'Tên lớp không được để trống'
      }
    },
    subject_id: {
      notEmpty: {
        errorMessage: 'ID môn học không được để trống'
      }
    }
  })
)
