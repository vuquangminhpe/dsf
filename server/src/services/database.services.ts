import { MongoClient, Db, Collection } from 'mongodb'
import User from '../models/schemas/User.schema'
import RefreshToken from '../models/schemas/RefreshToken.schema'
import VideoStatus from '../models/schemas/VideoStatus.schema'

import { envConfig } from '../constants/config'
import Question from '../models/schemas/Question.schema'
import Exam from '../models/schemas/Exam.schema'
import ExamSession from '../models/schemas/ExamSession.schema'
import MasterExam from '../models/schemas/MasterExam.schema'
import Feedback from '~/models/schemas/Feedback.schema'
import Payment from '~/models/schemas/Payment.schema'
import PackagePrice from '~/models/schemas/PackagePriceType.schema'

const uri =
  'mongodb+srv://minhvqhe176726:minhvqhe176726@management-employee.31yis.mongodb.net/?retryWrites=true&w=majority&appName=management-employee'
const dbName = 'app_code_student'

class DatabaseService {
  private static instance: DatabaseService
  public client: MongoClient
  public db: Db

  private constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(dbName)
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async connect() {
    try {
      await this.client.connect() // Kết nối nếu chưa có
      await this.db.command({ ping: 1 })
      console.log('Connected to MongoDB!')
    } catch (error) {
      console.error('MongoDB connection error:', error)
      throw error
    }
  }

  async indexExams() {
    const exists = await this.exams.indexExists(['exam_code_1', 'teacher_id_1'])
    if (!exists) {
      this.exams.createIndex({ exam_code: 1 }, { unique: true })
      this.exams.createIndex({ teacher_id: 1 })
    }
  }

  async indexExamSessions() {
    const exists = await this.examSessions.indexExists(['exam_id_1_student_id_1', 'student_id_1', 'exam_id_1'])
    if (!exists) {
      this.examSessions.createIndex({ exam_id: 1, student_id: 1 }, { unique: true })
      this.examSessions.createIndex({ student_id: 1 })
      this.examSessions.createIndex({ exam_id: 1 })
    }
  }

  get users(): Collection<User> {
    return this.db.collection(envConfig.usersCollection)
  }

  get refreshToken(): Collection<RefreshToken> {
    return this.db.collection(envConfig.refreshCollection)
  }

  get videoStatus(): Collection<VideoStatus> {
    return this.db.collection(envConfig.VideoStatusCollection)
  }
  get questions(): Collection<Question> {
    return this.db.collection('questions')
  }

  get exams(): Collection<Exam> {
    return this.db.collection('exams')
  }

  get examSessions(): Collection<ExamSession> {
    return this.db.collection('exam_sessions')
  }
  get masterExams(): Collection<MasterExam> {
    return this.db.collection('master_exams')
  }
  get textEmbeddings(): Collection<any> {
    return this.db.collection('text_embeddings')
  }

  get imageEmbeddings(): Collection<any> {
    return this.db.collection('image_embeddings')
  }

  get faceEmbeddings(): Collection<any> {
    return this.db.collection('face_embeddings')
  }

  get faceVerifications(): Collection<any> {
    return this.db.collection('face_verifications')
  }

  get deviceLogs(): Collection<any> {
    return this.db.collection('device_logs')
  }

  get sessionLogs(): Collection<any> {
    return this.db.collection('session_logs')
  }
  get examViolations(): Collection<any> {
    return this.db.collection('exam_violations')
  }
  get feedbacks(): Collection<Feedback> {
    return this.db.collection('feedbacks')
  }
  get payments(): Collection<Payment> {
    return this.db.collection('payments')
  }
  get packages(): Collection<PackagePrice> {
    return this.db.collection('packages')
  }
  async indexEmbeddings() {
    try {
      // Index for text embeddings
      const textEmbeddingIndexes = await this.textEmbeddings.listIndexes().toArray()
      if (!textEmbeddingIndexes.some((index) => index.name === 'user_id_1_type_1')) {
        await this.textEmbeddings.createIndex({ user_id: 1, type: 1 })
        await this.textEmbeddings.createIndex({ created_at: 1 })
      }

      // Index for image embeddings
      const imageEmbeddingIndexes = await this.imageEmbeddings.listIndexes().toArray()
      if (!imageEmbeddingIndexes.some((index) => index.name === 'user_id_1')) {
        await this.imageEmbeddings.createIndex({ user_id: 1 })
        await this.imageEmbeddings.createIndex({ created_at: 1 })
        await this.imageEmbeddings.createIndex({ image_hash: 1 })
      }

      // Index for face embeddings
      const faceEmbeddingIndexes = await this.faceEmbeddings.listIndexes().toArray()
      if (!faceEmbeddingIndexes.some((index) => index.name === 'user_id_1')) {
        await this.faceEmbeddings.createIndex({ user_id: 1 }, { unique: true })
        await this.faceEmbeddings.createIndex({ created_at: 1 })
      }

      console.log('Embedding and logging indexes created successfully')
    } catch (error) {
      console.error('Error creating embedding indexes:', error)
    }
  }
}

const databaseService = DatabaseService.getInstance()
databaseService.connect().catch(console.error)
export default databaseService
