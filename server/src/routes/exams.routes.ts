// src/routes/exams.routes.ts (Updated to include new controllers)
import { Router } from 'express'
import {
  generateExamController,
  getExamsController,
  getExamByIdController,
  getExamResultsController,
  getExamStatisticsController,
  updateExamStatusController,
  getStudentViolationsController,
  getClassExamResultsController,
  createMasterExamController,
  getMasterExamsController,
  getMasterExamByIdController,
  getExamsByMasterExamIdController,
  getClassesForMasterExamController,
  getClassExamResultsForMasterExamController,
  getMasterExamsWithStatusController,
  getMasterExamWithExamsController,
  toggleMasterExamStatusController,
  deleteMasterExamController
} from '../controllers/exams.controllers'
import {
  startExamController,
  submitExamController,
  getExamHistoryController,
  getSessionStatisticsController,
  verifyFaceDuringExamController,
  checkCameraAvailabilityController,
  uploadFaceImageMiddleware
} from '../controllers/examSessions.controllers'
import { AccessTokenValidator, verifiedUserValidator } from '../middlewares/users.middlewares'
import { teacherRoleValidator, typeCountValidator_Teacher } from '../middlewares/role.middlewares'
import { wrapAsync } from '../utils/handler'
import { generateExamValidator } from '../middlewares/exam.validator'
import {
  startExamValidator,
  submitExamValidator,
  verifyFaceDuringExamValidator,
  checkCameraAvailabilityValidator,
  getSessionStatisticsValidator
} from '../middlewares/examSession.validator'

const examsRouter = Router()

// All routes require authentication and verification
examsRouter.use(AccessTokenValidator, verifiedUserValidator)

// ===== TEACHER ROUTES =====
examsRouter.post(
  '/generate',
  teacherRoleValidator,
  generateExamValidator,
  typeCountValidator_Teacher,
  wrapAsync(generateExamController)
)
examsRouter.get('/', teacherRoleValidator, typeCountValidator_Teacher, wrapAsync(getExamsController))
examsRouter.get('/:exam_id', teacherRoleValidator, typeCountValidator_Teacher, wrapAsync(getExamByIdController))
examsRouter.put(
  '/:exam_id/status',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(updateExamStatusController)
)
examsRouter.get(
  '/:exam_id/results',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getExamResultsController)
)
examsRouter.get(
  '/:exam_id/statistics',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getExamStatisticsController)
)
examsRouter.get(
  '/:exam_id/class-results',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getClassExamResultsController)
)

// Session Statistics (for teachers)
examsRouter.get(
  '/:exam_id/session-statistics',
  teacherRoleValidator,
  getSessionStatisticsValidator,
  typeCountValidator_Teacher,
  wrapAsync(getSessionStatisticsController)
)

// Student violations route
examsRouter.get(
  '/:exam_id/students/:student_id/violations',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getStudentViolationsController)
)

// ===== STUDENT ROUTES =====

// Enhanced start exam with camera detection
examsRouter.post('/start', startExamValidator, uploadFaceImageMiddleware, wrapAsync(startExamController))

// Submit exam
examsRouter.post('/submit', submitExamValidator, wrapAsync(submitExamController))

// Get exam history
examsRouter.get('/history', wrapAsync(getExamHistoryController))

// Face verification during exam
examsRouter.post(
  '/verify-face',
  verifyFaceDuringExamValidator,
  uploadFaceImageMiddleware,
  wrapAsync(verifyFaceDuringExamController)
)

// Check camera availability
examsRouter.post('/check-camera', checkCameraAvailabilityValidator, wrapAsync(checkCameraAvailabilityController))

// ===== MASTER EXAM ROUTES =====
examsRouter.post(
  '/idea/master',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(createMasterExamController)
)
examsRouter.get('/idea/master', teacherRoleValidator, typeCountValidator_Teacher, wrapAsync(getMasterExamsController))
examsRouter.get(
  '/idea/master/:master_exam_id',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getMasterExamByIdController)
)
examsRouter.get(
  '/idea/master/:master_exam_id/exams',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getExamsByMasterExamIdController)
)
examsRouter.get(
  '/idea/master/:master_exam_id/classes',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getClassesForMasterExamController)
)
examsRouter.get(
  '/idea/master/:master_exam_id/classes/:className/results',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getClassExamResultsForMasterExamController)
)
examsRouter.get(
  '/idea/master-with-status',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getMasterExamsWithStatusController)
)
examsRouter.get(
  '/idea/master/:master_exam_id/with-exams',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(getMasterExamWithExamsController)
)

// Add new routes for master exam management
examsRouter.put(
  '/idea/master/:master_exam_id/toggle-status',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(toggleMasterExamStatusController)
)
examsRouter.delete(
  '/idea/master/:master_exam_id',
  teacherRoleValidator,
  typeCountValidator_Teacher,
  wrapAsync(deleteMasterExamController)
)

export default examsRouter
