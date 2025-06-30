import { Router } from 'express'
import {
  getClassGradesController,
  getStudentGradesController,
  getSubjectsController,
  getCommentsController,
  createGradeController,
  updateGradeController,
  deleteGradeController,
  updateBulkGradesController,
  createCommentController,
  updateCommentController,
  getClassStatisticsController,
  exportGradesController,
  importGradesController,
  getGradeHistoryController
} from '../controllers/grade.controllers'
import { AccessTokenValidator, verifiedUserValidator } from '../middlewares/users.middlewares'
import {
  getSubjectsValidator,
  getClassGradesValidator,
  getStudentGradesValidator,
  getCommentsValidator,
  createGradeValidator,
  updateGradeValidator,
  deleteGradeValidator,
  updateBulkGradesValidator,
  createCommentValidator,
  exportGradesValidator,
  importGradesValidator,
  getClassStatisticsValidator,
  getGradeHistoryValidator,
  checkTeacherClassPermission,
  checkTeacherStudentPermission,
  validateGradeImportFile
} from '../middlewares/grade.middlewares'
import { wrapAsync } from '../utils/handler'
import multer from 'multer'

const gradesRouter = Router()

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

/**
 * SUBJECTS ROUTES
 */

/**
 * Lấy danh sách môn học theo cấp học
 * GET /api/grades/subjects?grade_level=middle_school
 */
gradesRouter.get('/subjects', getSubjectsValidator, wrapAsync(getSubjectsController))

/**
 * GRADES ROUTES
 */

/**
 * Lấy dữ liệu bảng điểm của lớp
 * GET /api/grades/class/:className?subject_id=...&semester=1&school_year=2024-2025
 */
gradesRouter.get(
  '/class/:className',
  AccessTokenValidator,
  verifiedUserValidator,
  getClassGradesValidator,
  checkTeacherClassPermission,
  wrapAsync(getClassGradesController)
)

/**
 * Lấy thống kê điểm của lớp
 * GET /api/grades/class/:className/statistics?subject_id=...&semester=1&school_year=2024-2025
 */
gradesRouter.get(
  '/class/:className/statistics',
  AccessTokenValidator,
  verifiedUserValidator,
  getClassStatisticsValidator,
  checkTeacherClassPermission,
  wrapAsync(getClassStatisticsController)
)

/**
 * Lấy điểm của một học sinh cụ thể
 * GET /api/grades/student/:student_id?subject_id=...&semester=1&school_year=2024-2025
 */
gradesRouter.get(
  '/student/:student_id',
  AccessTokenValidator,
  verifiedUserValidator,
  getStudentGradesValidator,
  checkTeacherStudentPermission,
  wrapAsync(getStudentGradesController)
)

/**
 * Lấy lịch sử điểm của học sinh
 * GET /api/grades/history?student_id=...&subject_id=...&school_year=2024-2025
 */
gradesRouter.get(
  '/history',
  AccessTokenValidator,
  verifiedUserValidator,
  getGradeHistoryValidator,
  wrapAsync(getGradeHistoryController)
)

/**
 * Tạo điểm cho học sinh
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
 * Cập nhật điểm
 * PUT /api/grades/:grade_id
 */
gradesRouter.put(
  '/:grade_id',
  AccessTokenValidator,
  verifiedUserValidator,
  updateGradeValidator,
  wrapAsync(updateGradeController)
)

/**
 * Xóa điểm
 * DELETE /api/grades/:grade_id
 */
gradesRouter.delete(
  '/:grade_id',
  AccessTokenValidator,
  verifiedUserValidator,
  deleteGradeValidator,
  wrapAsync(deleteGradeController)
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

/**
 * COMMENTS ROUTES
 */

/**
 * Lấy thư viện nhận xét đã được lọc
 * GET /api/grades/comments?category=GOOD&type=STRENGTH&grade_level=middle_school
 */
gradesRouter.get('/comments', getCommentsValidator, wrapAsync(getCommentsController))

/**
 * Tạo nhận xét cho học sinh
 * POST /api/grades/comments
 */
gradesRouter.post(
  '/comments',
  AccessTokenValidator,
  verifiedUserValidator,
  createCommentValidator,
  wrapAsync(createCommentController)
)

/**
 * Cập nhật nhận xét
 * PUT /api/grades/comments/:comment_id
 */
gradesRouter.put(
  '/comments/:comment_id',
  AccessTokenValidator,
  verifiedUserValidator,
  wrapAsync(updateCommentController)
)

/**
 * IMPORT/EXPORT ROUTES
 */

/**
 * Xuất dữ liệu điểm
 * GET /api/grades/export?class_name=...&subject_id=...&semester=1&school_year=2024-2025&format=excel
 */
gradesRouter.get(
  '/export',
  AccessTokenValidator,
  verifiedUserValidator,
  exportGradesValidator,
  wrapAsync(exportGradesController)
)

/**
 * Nhập dữ liệu điểm từ file Excel
 * POST /api/grades/import
 */
gradesRouter.post(
  '/import',
  AccessTokenValidator,
  verifiedUserValidator,
  upload.single('grades_file'),
  validateGradeImportFile,
  importGradesValidator,
  wrapAsync(importGradesController)
)

export default gradesRouter
