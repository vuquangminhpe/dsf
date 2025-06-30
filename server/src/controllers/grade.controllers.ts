import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import gradesService from '../services/grades.services'
import { TokenPayload } from '../models/request/User.request'
import { ObjectId } from 'mongodb'
import HTTP_STATUS from '../constants/httpStatus'
import { GRADES_MESSAGES } from '../constants/messages'
import {
  GetClassGradesQuery,
  GetStudentGradesQuery,
  GetSubjectsQuery,
  GetCommentsQuery,
  CreateGradeBody,
  UpdateGradeBody,
  UpdateBulkGradesBody,
  ExportGradesQuery,
  ImportGradesBody,
  GetClassStatisticsQuery,
  CreateCommentBody,
  UpdateCommentBody,
  GetGradeHistoryQuery,
  ClassParams,
  StudentParams,
  GradeParams
} from '../models/request/Grade.request'
import databaseService from '../services/database.services'

/**
 * Lấy danh sách môn học theo cấp học
 * GET /api/grades/subjects?grade_level=middle_school
 */
export const getSubjectsController = async (
  req: Request<ParamsDictionary, any, any, GetSubjectsQuery>,
  res: Response
) => {
  try {
    const { grade_level } = req.query
    const subjects = await gradesService.getSubjects(grade_level)

    res.json({
      message: GRADES_MESSAGES.GET_SUBJECTS_SUCCESS,
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

/**
 * Lấy dữ liệu bảng điểm của lớp
 * GET /api/grades/class/:className?subject_id=...&semester=1&school_year=2024-2025
 */
export const getClassGradesController = async (
  req: Request<ClassParams, any, any, GetClassGradesQuery>,
  res: Response
) => {
  try {
    const { className } = req.params
    const { subject_id, semester, school_year } = req.query
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload

    const result = await gradesService.getClassGrades({
      className,
      subject_id,
      semester: parseInt(semester),
      school_year,
      teacher_id
    })

    res.json({
      message: GRADES_MESSAGES.GET_CLASS_GRADES_SUCCESS,
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

/**
 * Lấy điểm của một học sinh cụ thể
 * GET /api/grades/student/:student_id?subject_id=...&semester=1&school_year=2024-2025
 */
export const getStudentGradesController = async (
  req: Request<StudentParams, any, any, GetStudentGradesQuery>,
  res: Response
) => {
  try {
    const { student_id } = req.params
    const { subject_id, semester, school_year } = req.query

    const result = await gradesService.getStudentGrades({
      student_id,
      subject_id: subject_id as string,
      semester: semester ? parseInt(semester) : (undefined as any),
      school_year: school_year as string
    })

    res.json({
      message: GRADES_MESSAGES.GET_STUDENT_GRADES_SUCCESS,
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

/**
 * Lấy thư viện nhận xét đã được lọc
 * GET /api/grades/comments?category=GOOD&type=STRENGTH&grade_level=middle_school
 */
export const getCommentsController = async (
  req: Request<ParamsDictionary, any, any, GetCommentsQuery>,
  res: Response
) => {
  try {
    const { category, type, grade_level } = req.query
    const comments = await gradesService.getComments({
      category,
      type,
      grade_level
    })

    res.json({
      message: GRADES_MESSAGES.GET_COMMENTS_SUCCESS,
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

/**
 * Tạo/cập nhật điểm cho học sinh
 * POST /api/grades
 */
export const createGradeController = async (req: Request<ParamsDictionary, any, CreateGradeBody>, res: Response) => {
  try {
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const gradeData = {
      ...req.body,
      teacher_id: new ObjectId(teacher_id),
      student_id: new ObjectId(req.body.student_id),
      subject_id: new ObjectId(req.body.subject_id)
    }

    const result = await gradesService.createGrade(gradeData)

    res.status(HTTP_STATUS.CREATED).json({
      message: GRADES_MESSAGES.CREATE_GRADE_SUCCESS,
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

/**
 * Cập nhật điểm
 * PUT /api/grades/:grade_id
 */
export const updateGradeController = async (req: Request<GradeParams, any, UpdateGradeBody>, res: Response) => {
  try {
    const { grade_id } = req.params
    const { score } = req.body
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload

    const result = await databaseService.db.collection('grades').updateOne(
      {
        _id: new ObjectId(grade_id),
        teacher_id: new ObjectId(teacher_id)
      },
      {
        $set: {
          score,
          updated_at: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: GRADES_MESSAGES.GRADE_NOT_FOUND
      })
    }

    res.json({
      message: GRADES_MESSAGES.UPDATE_GRADE_SUCCESS,
      result: { grade_id, score }
    })
  } catch (error) {
    console.error('Error updating grade:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi cập nhật điểm',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Xóa điểm
 * DELETE /api/grades/:grade_id
 */
export const deleteGradeController = async (req: Request<GradeParams>, res: Response) => {
  try {
    const { grade_id } = req.params
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload

    const result = await databaseService.db.collection('grades').deleteOne({
      _id: new ObjectId(grade_id),
      teacher_id: new ObjectId(teacher_id)
    })

    if (result.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: GRADES_MESSAGES.GRADE_NOT_FOUND
      })
    }

    res.json({
      message: GRADES_MESSAGES.DELETE_GRADE_SUCCESS
    })
  } catch (error) {
    console.error('Error deleting grade:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi xóa điểm',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Cập nhật hàng loạt điểm và nhận xét cho cả lớp
 * PUT /api/grades/bulk-update
 */
export const updateBulkGradesController = async (
  req: Request<ParamsDictionary, any, UpdateBulkGradesBody>,
  res: Response
) => {
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
      message: GRADES_MESSAGES.BULK_UPDATE_SUCCESS,
      result
    })
  } catch (error) {
    console.error('Error bulk updating grades:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: GRADES_MESSAGES.BULK_UPDATE_FAILED,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Tạo nhận xét cho học sinh
 * POST /api/grades/comments
 */
export const createCommentController = async (
  req: Request<ParamsDictionary, any, CreateCommentBody>,
  res: Response
) => {
  try {
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const commentData = {
      ...req.body,
      teacher_id: new ObjectId(teacher_id),
      student_id: new ObjectId(req.body.student_id),
      subject_id: new ObjectId(req.body.subject_id),
      created_at: new Date(),
      updated_at: new Date()
    }

    const result = await databaseService.db.collection('student_comments').insertOne(commentData)

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Tạo nhận xét thành công',
      result: {
        _id: result.insertedId,
        ...commentData
      }
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi tạo nhận xét',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Cập nhật nhận xét
 * PUT /api/grades/comments/:comment_id
 */
export const updateCommentController = async (
  req: Request<{ comment_id: string }, any, UpdateCommentBody>,
  res: Response
) => {
  try {
    const { comment_id } = req.params
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const updateData = {
      ...req.body,
      updated_at: new Date()
    }

    const result = await databaseService.db.collection('student_comments').updateOne(
      {
        _id: new ObjectId(comment_id),
        teacher_id: new ObjectId(teacher_id)
      },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: GRADES_MESSAGES.COMMENT_NOT_FOUND
      })
    }

    res.json({
      message: 'Cập nhật nhận xét thành công',
      result: { comment_id, ...updateData }
    })
  } catch (error) {
    console.error('Error updating comment:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi cập nhật nhận xét',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Lấy thống kê điểm của lớp
 * GET /api/grades/class/:className/statistics?subject_id=...&semester=1&school_year=2024-2025
 */
export const getClassStatisticsController = async (
  req: Request<ClassParams, any, any, GetClassStatisticsQuery>,
  res: Response
) => {
  try {
    const { className } = req.params
    const { subject_id, semester, school_year } = req.query

    // Lấy tất cả điểm của lớp
    const grades = await databaseService.db
      .collection('grades')
      .find({
        class_name: className,
        subject_id: new ObjectId(subject_id),
        semester: parseInt(semester),
        school_year
      })
      .toArray()

    // Tính thống kê
    const totalStudents = await databaseService.users.countDocuments({
      class: className,
      role: 'student' as any
    })

    const studentsWithGrades = new Set(grades.map((g) => g.student_id.toString())).size
    const scores = grades.map((g) => g.score)
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0
    const passRate = (scores.filter((s) => s >= 5).length / scores.length) * 100

    const gradeDistribution = {
      excellent: scores.filter((s) => s >= 8.5).length,
      good: scores.filter((s) => s >= 7.0 && s < 8.5).length,
      average: scores.filter((s) => s >= 5.5 && s < 7.0).length,
      weak: scores.filter((s) => s >= 4.0 && s < 5.5).length,
      poor: scores.filter((s) => s < 4.0).length
    }

    const statistics = {
      class_name: className,
      subject_id,
      semester: parseInt(semester),
      school_year,
      total_students: totalStudents,
      students_with_grades: studentsWithGrades,
      average_score: Math.round(averageScore * 100) / 100,
      highest_score: highestScore,
      lowest_score: lowestScore,
      pass_rate: Math.round(passRate * 100) / 100,
      grade_distribution: gradeDistribution
    }

    res.json({
      message: 'Lấy thống kê thành công',
      result: statistics
    })
  } catch (error) {
    console.error('Error getting class statistics:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi lấy thống kê',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Xuất dữ liệu điểm
 * GET /api/grades/export?class_name=...&subject_id=...&semester=1&school_year=2024-2025&format=excel
 */
export const exportGradesController = async (
  req: Request<ParamsDictionary, any, any, ExportGradesQuery>,
  res: Response
) => {
  try {
    const { class_name, subject_id, semester, school_year, format = 'excel' } = req.query
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload

    // Lấy dữ liệu điểm để xuất
    const result = await gradesService.getClassGrades({
      className: class_name,
      subject_id,
      semester: parseInt(semester),
      school_year,
      teacher_id
    })

    // Tùy theo format, có thể tạo file Excel hoặc PDF
    // Đây là phần có thể mở rộng sau
    res.json({
      message: GRADES_MESSAGES.EXPORT_GRADES_SUCCESS,
      result: {
        export_data: result,
        format,
        exported_at: new Date()
      }
    })
  } catch (error) {
    console.error('Error exporting grades:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: GRADES_MESSAGES.EXPORT_FAILED,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Nhập dữ liệu điểm từ file
 * POST /api/grades/import
 */
export const importGradesController = async (req: Request<ParamsDictionary, any, ImportGradesBody>, res: Response) => {
  try {
    const { user_id: teacher_id } = req.decode_authorization as TokenPayload
    const { class_name, subject_id, semester, school_year, grades } = req.body

    const successfulImports = []
    const failedImports = []

    for (const gradeData of grades) {
      try {
        // Tìm student theo username
        const student = await databaseService.users.findOne({
          username: gradeData.student_username,
          class: class_name,
          role: 'student' as any
        })

        if (!student) {
          failedImports.push({
            username: gradeData.student_username,
            error: 'Student not found'
          })
          continue
        }

        const grade = {
          student_id: student._id,
          subject_id: new ObjectId(subject_id),
          class_name,
          semester,
          school_year,
          exam_type: gradeData.exam_type,
          exam_sequence: gradeData.exam_sequence,
          score: gradeData.score,
          teacher_id: new ObjectId(teacher_id),
          created_at: new Date(),
          updated_at: new Date()
        }

        await databaseService.db.collection('grades').insertOne(grade)
        successfulImports.push({
          username: gradeData.student_username,
          grade_id: grade.student_id.toString()
        })
      } catch (error) {
        failedImports.push({
          username: gradeData.student_username,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    res.json({
      message: GRADES_MESSAGES.IMPORT_GRADES_SUCCESS,
      result: {
        total_grades: grades.length,
        successful_imports: successfulImports.length,
        failed_imports: failedImports.length,
        successful_data: successfulImports,
        failed_data: failedImports
      }
    })
  } catch (error) {
    console.error('Error importing grades:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: GRADES_MESSAGES.IMPORT_FAILED,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Lấy lịch sử điểm của học sinh
 * GET /api/grades/history?student_id=...&subject_id=...&school_year=2024-2025
 */
export const getGradeHistoryController = async (
  req: Request<ParamsDictionary, any, any, GetGradeHistoryQuery>,
  res: Response
) => {
  try {
    const { student_id, subject_id, school_year } = req.query

    const query: any = {
      student_id: new ObjectId(student_id)
    }

    if (subject_id) {
      query.subject_id = new ObjectId(subject_id)
    }

    if (school_year) {
      query.school_year = school_year
    }

    const grades = await databaseService.db
      .collection('grades')
      .find(query)
      .sort({ school_year: -1, semester: -1, created_at: -1 })
      .toArray()

    // Group by school year and semester
    const groupedGrades = grades.reduce((acc: any, grade) => {
      const key = `${grade.school_year}-${grade.semester}`
      if (!acc[key]) {
        acc[key] = {
          school_year: grade.school_year,
          semester: grade.semester,
          grades: []
        }
      }
      acc[key].grades.push(grade)
      return acc
    }, {})

    res.json({
      message: 'Lấy lịch sử điểm thành công',
      result: {
        student_id,
        history: Object.values(groupedGrades)
      }
    })
  } catch (error) {
    console.error('Error getting grade history:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi khi lấy lịch sử điểm',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
