import { checkSchema, ParamSchema } from 'express-validator'
import { validate } from '../utils/validation'
import { ObjectId } from 'mongodb'
import { GRADES_MESSAGES } from '../constants/messages'
import databaseService from '../services/database.services'
import { ErrorWithStatus } from '../models/Errors'
import HTTP_STATUS from '../constants/httpStatus'
import { ExamTypeEnum } from '../models/schemas/Comment.schema'
import { GradeLevel } from '../models/schemas/Subject.schema'
import { TokenPayload } from '../models/request/User.request'
import { Request } from 'express'

// Common validation schemas
const subjectIdSchema: ParamSchema = {
  notEmpty: {
    errorMessage: GRADES_MESSAGES.INVALID_SUBJECT_ID
  },
  custom: {
    options: async (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(GRADES_MESSAGES.INVALID_SUBJECT_ID)
      }

      const subject = await databaseService.db.collection('subjects').findOne({ _id: new ObjectId(value) })
      if (!subject) {
        throw new Error(GRADES_MESSAGES.SUBJECT_NOT_FOUND)
      }

      return true
    }
  }
}

const studentIdSchema: ParamSchema = {
  notEmpty: {
    errorMessage: GRADES_MESSAGES.INVALID_STUDENT_ID
  },
  custom: {
    options: async (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(GRADES_MESSAGES.INVALID_STUDENT_ID)
      }

      const student = await databaseService.users.findOne({
        _id: new ObjectId(value as string),
        role: 'student' as any
      })
      if (!student) {
        throw new Error(GRADES_MESSAGES.STUDENT_NOT_FOUND)
      }

      return true
    }
  }
}

const classNameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: GRADES_MESSAGES.INVALID_CLASS_NAME
  },
  isString: {
    errorMessage: GRADES_MESSAGES.INVALID_CLASS_NAME
  },
  trim: true,
  isLength: {
    options: { min: 1, max: 50 },
    errorMessage: GRADES_MESSAGES.INVALID_CLASS_NAME
  }
}

const semesterSchema: ParamSchema = {
  isInt: {
    options: { min: 1, max: 2 },
    errorMessage: GRADES_MESSAGES.INVALID_SEMESTER
  },
  toInt: true
}

const schoolYearSchema: ParamSchema = {
  notEmpty: {
    errorMessage: GRADES_MESSAGES.INVALID_SCHOOL_YEAR
  },
  matches: {
    options: /^\d{4}-\d{4}$/,
    errorMessage: GRADES_MESSAGES.INVALID_SCHOOL_YEAR
  }
}

const scoreSchema: ParamSchema = {
  isFloat: {
    options: { min: 0, max: 10 },
    errorMessage: GRADES_MESSAGES.INVALID_SCORE
  },
  toFloat: true
}

const examTypeSchema: ParamSchema = {
  isIn: {
    options: [Object.values(ExamTypeEnum)],
    errorMessage: GRADES_MESSAGES.INVALID_EXAM_TYPE
  }
}

// Validators
export const getSubjectsValidator = validate(
  checkSchema({
    grade_level: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [Object.values(GradeLevel)],
        errorMessage: GRADES_MESSAGES.INVALID_GRADE_LEVEL
      }
    }
  })
)

export const getClassGradesValidator = validate(
  checkSchema({
    className: {
      in: ['params'],
      ...classNameSchema
    },
    subject_id: {
      in: ['query'],
      ...subjectIdSchema
    },
    semester: {
      in: ['query'],
      ...semesterSchema
    },
    school_year: {
      in: ['query'],
      ...schoolYearSchema
    }
  })
)

export const getStudentGradesValidator = validate(
  checkSchema({
    student_id: {
      in: ['params'],
      ...studentIdSchema
    },
    subject_id: {
      in: ['query'],
      optional: true,
      ...subjectIdSchema
    },
    semester: {
      in: ['query'],
      optional: true,
      ...semesterSchema
    },
    school_year: {
      in: ['query'],
      optional: true,
      ...schoolYearSchema
    }
  })
)

export const getCommentsValidator = validate(
  checkSchema({
    category: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [['EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT', 'POOR']],
        errorMessage: 'Category must be one of: EXCELLENT, GOOD, AVERAGE, NEEDS_IMPROVEMENT, POOR'
      }
    },
    type: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [['STRENGTH', 'WEAKNESS', 'PROGRESS']],
        errorMessage: GRADES_MESSAGES.INVALID_COMMENT_TYPE
      }
    },
    grade_level: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [Object.values(GradeLevel)],
        errorMessage: GRADES_MESSAGES.INVALID_GRADE_LEVEL
      }
    }
  })
)

export const createGradeValidator = validate(
  checkSchema({
    student_id: {
      in: ['body'],
      ...studentIdSchema
    },
    subject_id: {
      in: ['body'],
      ...subjectIdSchema
    },
    class_name: {
      in: ['body'],
      ...classNameSchema
    },
    semester: {
      in: ['body'],
      ...semesterSchema
    },
    school_year: {
      in: ['body'],
      ...schoolYearSchema
    },
    exam_type: {
      in: ['body'],
      ...examTypeSchema
    },
    exam_sequence: {
      in: ['body'],
      optional: true,
      isInt: {
        options: { min: 1, max: 10 },
        errorMessage: 'Exam sequence must be between 1 and 10'
      },
      toInt: true
    },
    score: {
      in: ['body'],
      ...scoreSchema
    }
  })
)

export const updateGradeValidator = validate(
  checkSchema({
    grade_id: {
      in: ['params'],
      custom: {
        options: async (value) => {
          if (!ObjectId.isValid(value)) {
            throw new Error('Invalid grade ID')
          }

          const grade = await databaseService.db.collection('grades').findOne({ _id: new ObjectId(value) })
          if (!grade) {
            throw new Error(GRADES_MESSAGES.GRADE_NOT_FOUND)
          }

          return true
        }
      }
    },
    score: {
      in: ['body'],
      ...scoreSchema
    }
  })
)

export const deleteGradeValidator = validate(
  checkSchema({
    grade_id: {
      in: ['params'],
      custom: {
        options: async (value) => {
          if (!ObjectId.isValid(value)) {
            throw new Error('Invalid grade ID')
          }

          const grade = await databaseService.db.collection('grades').findOne({ _id: new ObjectId(value) })
          if (!grade) {
            throw new Error(GRADES_MESSAGES.GRADE_NOT_FOUND)
          }

          return true
        }
      }
    }
  })
)

export const updateBulkGradesValidator = validate(
  checkSchema({
    grades: {
      in: ['body'],
      isArray: {
        errorMessage: GRADES_MESSAGES.GRADES_DATA_INVALID
      },
      custom: {
        options: (grades: any[]) => {
          if (!Array.isArray(grades) || grades.length === 0) {
            throw new Error(GRADES_MESSAGES.GRADES_DATA_INVALID)
          }

          for (const grade of grades) {
            if (!ObjectId.isValid(grade.student_id)) {
              throw new Error(GRADES_MESSAGES.INVALID_STUDENT_ID)
            }
            if (!Object.values(ExamTypeEnum).includes(grade.exam_type)) {
              throw new Error(GRADES_MESSAGES.INVALID_EXAM_TYPE)
            }
            if (typeof grade.score !== 'number' || grade.score < 0 || grade.score > 10) {
              throw new Error(GRADES_MESSAGES.INVALID_SCORE)
            }
          }

          return true
        }
      }
    },
    comments: {
      in: ['body'],
      isArray: {
        errorMessage: GRADES_MESSAGES.COMMENTS_DATA_INVALID
      },
      custom: {
        options: (comments: any[]) => {
          if (!Array.isArray(comments)) {
            throw new Error(GRADES_MESSAGES.COMMENTS_DATA_INVALID)
          }

          for (const comment of comments) {
            if (!ObjectId.isValid(comment.student_id)) {
              throw new Error(GRADES_MESSAGES.INVALID_STUDENT_ID)
            }
            if (!Array.isArray(comment.strengths) || !Array.isArray(comment.weaknesses)) {
              throw new Error(GRADES_MESSAGES.COMMENTS_DATA_INVALID)
            }
          }

          return true
        }
      }
    },
    class_name: {
      in: ['body'],
      ...classNameSchema
    },
    subject_id: {
      in: ['body'],
      ...subjectIdSchema
    },
    semester: {
      in: ['body'],
      ...semesterSchema
    },
    school_year: {
      in: ['body'],
      ...schoolYearSchema
    }
  })
)

export const createCommentValidator = validate(
  checkSchema({
    student_id: {
      in: ['body'],
      ...studentIdSchema
    },
    subject_id: {
      in: ['body'],
      ...subjectIdSchema
    },
    class_name: {
      in: ['body'],
      ...classNameSchema
    },
    semester: {
      in: ['body'],
      ...semesterSchema
    },
    school_year: {
      in: ['body'],
      ...schoolYearSchema
    },
    strengths: {
      in: ['body'],
      isArray: {
        errorMessage: 'Strengths must be an array'
      }
    },
    weaknesses: {
      in: ['body'],
      isArray: {
        errorMessage: 'Weaknesses must be an array'
      }
    },
    progress: {
      in: ['body'],
      isString: {
        errorMessage: 'Progress must be a string'
      },
      trim: true
    },
    average_score: {
      in: ['body'],
      optional: true,
      ...scoreSchema
    }
  })
)

export const exportGradesValidator = validate(
  checkSchema({
    class_name: {
      in: ['query'],
      ...classNameSchema
    },
    subject_id: {
      in: ['query'],
      ...subjectIdSchema
    },
    semester: {
      in: ['query'],
      ...semesterSchema
    },
    school_year: {
      in: ['query'],
      ...schoolYearSchema
    },
    format: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [['excel', 'pdf']],
        errorMessage: 'Format must be either excel or pdf'
      }
    }
  })
)

export const importGradesValidator = validate(
  checkSchema({
    class_name: {
      in: ['body'],
      ...classNameSchema
    },
    subject_id: {
      in: ['body'],
      ...subjectIdSchema
    },
    semester: {
      in: ['body'],
      ...semesterSchema
    },
    school_year: {
      in: ['body'],
      ...schoolYearSchema
    },
    grades: {
      in: ['body'],
      isArray: {
        errorMessage: 'Grades must be an array'
      },
      custom: {
        options: (grades: any[]) => {
          if (!Array.isArray(grades) || grades.length === 0) {
            throw new Error('Grades array cannot be empty')
          }

          for (const grade of grades) {
            if (!grade.student_username || typeof grade.student_username !== 'string') {
              throw new Error('Student username is required')
            }
            if (!Object.values(ExamTypeEnum).includes(grade.exam_type)) {
              throw new Error(GRADES_MESSAGES.INVALID_EXAM_TYPE)
            }
            if (typeof grade.score !== 'number' || grade.score < 0 || grade.score > 10) {
              throw new Error(GRADES_MESSAGES.INVALID_SCORE)
            }
          }

          return true
        }
      }
    }
  })
)

export const getClassStatisticsValidator = validate(
  checkSchema({
    className: {
      in: ['params'],
      ...classNameSchema
    },
    subject_id: {
      in: ['query'],
      ...subjectIdSchema
    },
    semester: {
      in: ['query'],
      ...semesterSchema
    },
    school_year: {
      in: ['query'],
      ...schoolYearSchema
    }
  })
)

export const getGradeHistoryValidator = validate(
  checkSchema({
    student_id: {
      in: ['query'],
      ...studentIdSchema
    },
    subject_id: {
      in: ['query'],
      optional: true,
      ...subjectIdSchema
    },
    school_year: {
      in: ['query'],
      optional: true,
      ...schoolYearSchema
    }
  })
)

// Permission middleware to check if teacher can access class
export const checkTeacherClassPermission = async (req: Request, res: any, next: any) => {
  try {
    const { user_id: teacher_id, role } = req.decode_authorization as TokenPayload
    const className = req.params.className || req.body.class_name || req.query.class_name

    // Admin can access all classes
    if (role === 'admin') {
      return next()
    }

    // Check if teacher has students in this class
    const studentsInClass = await databaseService.users.countDocuments({
      class: className,
      teacher_id: new ObjectId(teacher_id),
      role: 'student' as any
    })

    if (studentsInClass === 0) {
      throw new ErrorWithStatus({
        message: GRADES_MESSAGES.NO_PERMISSION,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Middleware to check if teacher can access student
export const checkTeacherStudentPermission = async (req: Request, res: any, next: any) => {
  try {
    const { user_id: teacher_id, role } = req.decode_authorization as TokenPayload
    const student_id = req.params.student_id || req.body.student_id

    // Admin can access all students
    if (role === 'admin') {
      return next()
    }

    // Check if student belongs to this teacher
    const student = await databaseService.users.findOne({
      _id: new ObjectId(student_id as string),
      teacher_id: new ObjectId(teacher_id),
      role: 'student' as any
    })

    if (!student) {
      throw new ErrorWithStatus({
        message: GRADES_MESSAGES.NO_PERMISSION,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Middleware to validate file upload for import
export const validateGradeImportFile = (req: Request, res: any, next: any) => {
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'File is required for import'
    })
  }

  const allowedMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Only Excel files (.xlsx, .xls) are allowed'
    })
  }

  next()
}
