import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import { SUBJECTS_BY_GRADE_LEVEL } from '../constants/subjects'
import { ALL_COMMENTS, getCommentsByType, calculateSubjectAverage } from '../constants/comments'
import { GradeLevel } from '../models/schemas/Subject.schema'

interface GetClassGradesParams {
  className: string
  subject_id: string
  semester: number
  school_year: string
  teacher_id: string
}

interface GetStudentGradesParams {
  student_id: string
  subject_id: string
  semester: number
  school_year: string
}

interface CreateGradeParams {
  student_id: ObjectId
  subject_id: ObjectId
  class_name: string
  semester: number
  school_year: string
  exam_type: 'TX' | 'GK' | 'CK'
  exam_sequence?: number
  score: number
  teacher_id: ObjectId
}

interface UpdateBulkGradesParams {
  grades: any[]
  comments: any[]
  class_name: string
  subject_id: string
  semester: number
  school_year: string
  teacher_id: string
}

interface GetCommentsParams {
  category?: string
  type?: string
  grade_level?: string
}

class GradesService {
  /**
   * Lấy danh sách môn học theo cấp học
   */
  async getSubjects(grade_level?: string) {
    try {
      if (grade_level && Object.values(GradeLevel).includes(grade_level as GradeLevel)) {
        // Lấy từ constants nếu có grade_level
        const subjects = SUBJECTS_BY_GRADE_LEVEL[grade_level as keyof typeof SUBJECTS_BY_GRADE_LEVEL]

        // Hoặc lấy từ database nếu đã có collection subjects
        const dbSubjects = await databaseService.db.collection('subjects').find({ grade_level }).toArray()

        return dbSubjects.length > 0 ? dbSubjects : subjects
      }

      // Lấy tất cả môn học từ database
      const allSubjects = await databaseService.db.collection('subjects').find({}).toArray()

      return allSubjects
    } catch (error) {
      console.error('Error in getSubjects:', error)
      throw error
    }
  }

  /**
   * Lấy dữ liệu bảng điểm của lớp
   */
  async getClassGrades(params: GetClassGradesParams) {
    try {
      const { className, subject_id, semester, school_year, teacher_id } = params

      // Lấy danh sách học sinh của lớp
      const students = await databaseService.users
        .find({
          class: className,
          role: 'student' as any
        })
        .project({
          _id: 1,
          name: 1,
          username: 1,
          class: 1
        })
        .sort({ name: 1 })
        .toArray()

      // Lấy thông tin môn học
      const subject = await databaseService.db.collection('subjects').findOne({ _id: new ObjectId(subject_id) })

      // Lấy tất cả điểm của lớp cho môn học này
      const grades = await databaseService.db
        .collection('grades')
        .find({
          subject_id: new ObjectId(subject_id),
          class_name: className,
          semester,
          school_year
        })
        .toArray()

      // Lấy tất cả nhận xét của lớp
      const comments = await databaseService.db
        .collection('student_comments')
        .find({
          subject_id: new ObjectId(subject_id),
          class_name: className,
          semester,
          school_year
        })
        .toArray()

      // Xử lý dữ liệu cho từng học sinh
      const studentGrades = students.map((student) => {
        // Lấy điểm của học sinh này
        const studentScores = grades.filter((g) => g.student_id.toString() === student._id.toString())

        // Nhóm điểm theo loại
        const scoresByType = {
          TX: studentScores.filter((s) => s.exam_type === 'TX').map((s) => s.score),
          GK: studentScores.find((s) => s.exam_type === 'GK')?.score || null,
          CK: studentScores.find((s) => s.exam_type === 'CK')?.score || null
        }

        // Tính điểm trung bình
        let averageScore = null
        if (scoresByType.TX.length > 0 || scoresByType.GK || scoresByType.CK) {
          averageScore = calculateSubjectAverage({
            tx: scoresByType.TX,
            gk: scoresByType.GK || 0,
            ck: scoresByType.CK || 0
          })
        }

        // Lấy nhận xét của học sinh
        const studentComment = comments.find((c) => c.student_id.toString() === student._id.toString())

        return {
          student_id: student._id,
          student_name: student.name,
          student_username: student.username,
          scores: scoresByType,
          average_score: averageScore,
          comments: studentComment
            ? {
                strengths: studentComment.strengths,
                weaknesses: studentComment.weaknesses,
                progress: studentComment.progress
              }
            : {
                strengths: [],
                weaknesses: [],
                progress: ''
              }
        }
      })

      // Tạo cấu trúc cột điểm động
      const examColumns = [
        { key: 'TX', label: 'Thường xuyên', type: 'multiple' },
        { key: 'GK', label: 'Giữa kỳ', type: 'single' },
        { key: 'CK', label: 'Cuối kỳ', type: 'single' },
        { key: 'DTBm', label: 'ĐTB môn', type: 'calculated' }
      ]

      return {
        subject: subject,
        students: studentGrades,
        exam_columns: examColumns,
        class_info: {
          class_name: className,
          semester,
          school_year,
          total_students: students.length
        }
      }
    } catch (error) {
      console.error('Error in getClassGrades:', error)
      throw error
    }
  }

  /**
   * Lấy điểm của một học sinh cụ thể
   */
  async getStudentGrades(params: GetStudentGradesParams) {
    try {
      const { student_id, subject_id, semester, school_year } = params

      const grades = await databaseService.db
        .collection('grades')
        .find({
          student_id: new ObjectId(student_id),
          subject_id: new ObjectId(subject_id),
          semester,
          school_year
        })
        .toArray()

      const comments = await databaseService.db.collection('student_comments').findOne({
        student_id: new ObjectId(student_id),
        subject_id: new ObjectId(subject_id),
        semester,
        school_year
      })

      return {
        grades,
        comments: comments || {
          strengths: [],
          weaknesses: [],
          progress: ''
        }
      }
    } catch (error) {
      console.error('Error in getStudentGrades:', error)
      throw error
    }
  }

  /**
   * Lấy thư viện nhận xét đã được lọc
   */
  async getComments(params: GetCommentsParams) {
    try {
      const { category, type, grade_level } = params

      // Sử dụng function từ constants
      if (type && category) {
        return getCommentsByType(type as any, category as any, grade_level as any)
      }

      // Lấy từ database nếu có
      const query: any = {}
      if (category) query.category = category
      if (type) query.type = type
      if (grade_level) query.grade_level = grade_level

      const dbComments = await databaseService.db.collection('comments').find(query).toArray()

      return dbComments.length > 0
        ? dbComments
        : ALL_COMMENTS.filter((comment) => {
            if (category && comment.category !== category) return false
            if (type && comment.type !== type) return false
            if (grade_level && comment.grade_level && comment.grade_level !== grade_level) return false
            return true
          })
    } catch (error) {
      console.error('Error in getComments:', error)
      throw error
    }
  }

  /**
   * Tạo điểm mới
   */
  async createGrade(gradeData: CreateGradeParams) {
    try {
      const grade = {
        ...gradeData,
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await databaseService.db.collection('grades').insertOne(grade)

      return {
        _id: result.insertedId,
        ...grade
      }
    } catch (error) {
      console.error('Error in createGrade:', error)
      throw error
    }
  }

  /**
   * Cập nhật hàng loạt điểm và nhận xét
   */
  async updateBulkGrades(params: UpdateBulkGradesParams) {
    try {
      const { grades, comments, class_name, subject_id, semester, school_year, teacher_id } = params

      const session = databaseService.client?.startSession()
      let result = { gradesUpdated: 0, commentsUpdated: 0 }

      try {
        await session?.withTransaction(async () => {
          // Cập nhật điểm
          for (const gradeData of grades) {
            await databaseService.db.collection('grades').updateOne(
              {
                student_id: new ObjectId(gradeData.student_id),
                subject_id: new ObjectId(subject_id),
                class_name,
                semester,
                school_year,
                exam_type: gradeData.exam_type,
                exam_sequence: gradeData.exam_sequence
              },
              {
                $set: {
                  score: gradeData.score,
                  teacher_id: new ObjectId(teacher_id),
                  updated_at: new Date()
                }
              },
              { upsert: true, session }
            )
            result.gradesUpdated++
          }

          // Cập nhật nhận xét
          for (const commentData of comments) {
            await databaseService.db.collection('student_comments').updateOne(
              {
                student_id: new ObjectId(commentData.student_id),
                subject_id: new ObjectId(subject_id),
                class_name,
                semester,
                school_year
              },
              {
                $set: {
                  strengths: commentData.strengths,
                  weaknesses: commentData.weaknesses,
                  progress: commentData.progress,
                  average_score: commentData.average_score,
                  teacher_id: new ObjectId(teacher_id),
                  updated_at: new Date()
                }
              },
              { upsert: true, session }
            )
            result.commentsUpdated++
          }
        })

        return result
      } finally {
        await session?.endSession()
      }
    } catch (error) {
      console.error('Error in updateBulkGrades:', error)
      throw error
    }
  }

  /**
   * Khởi tạo dữ liệu môn học cơ bản
   */
  async initializeSubjects() {
    try {
      const existingSubjects = await databaseService.db.collection('subjects').countDocuments()

      if (existingSubjects > 0) {
        console.log('Subjects already initialized')
        return
      }

      console.log('Initializing subjects data...')

      const allSubjects = []
      for (const [gradeLevel, subjects] of Object.entries(SUBJECTS_BY_GRADE_LEVEL)) {
        for (const subject of subjects) {
          allSubjects.push({
            ...subject,
            grade_level: gradeLevel,
            created_at: new Date(),
            updated_at: new Date()
          })
        }
      }

      await databaseService.db.collection('subjects').insertMany(allSubjects)

      console.log(`Initialized ${allSubjects.length} subjects`)
    } catch (error) {
      console.error('Error initializing subjects:', error)
      throw error
    }
  }

  /**
   * Khởi tạo dữ liệu nhận xét cơ bản
   */
  async initializeComments() {
    try {
      const existingComments = await databaseService.db.collection('comments').countDocuments()

      if (existingComments > 0) {
        console.log('Comments already initialized')
        return
      }

      console.log('Initializing comments data...')

      const commentsWithDates = ALL_COMMENTS.map((comment) => ({
        ...comment,
        _id: new ObjectId(),
        created_at: new Date(),
        updated_at: new Date()
      }))

      await databaseService.db.collection('comments').insertMany(commentsWithDates)

      console.log(`Initialized ${commentsWithDates.length} comments`)
    } catch (error) {
      console.error('Error initializing comments:', error)
      throw error
    }
  }
}

const gradesService = new GradesService()
export default gradesService
