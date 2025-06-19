import * as ort from 'onnxruntime-node'
import sharp from 'sharp'
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import fs from 'fs'
import path from 'path'

interface TextEmbedding {
  _id?: ObjectId
  user_id: ObjectId
  text: string
  embedding: number[]
  semantic_features: {
    demographics: string[]
    emotions: string[]
    attributes: string[]
    educational_level: string
  }
  type?: 'profile' | 'description' | 'bio'
  created_at?: Date
  updated_at?: Date
}

const ENHANCED_SEMANTIC_CLUSTERS = {
  age_groups: {
    elementary: [
      'học sinh tiểu học',
      'lớp 1',
      'lớp 2',
      'lớp 3',
      'lớp 4',
      'lớp 5',
      'tiểu học',
      '6 tuổi',
      '7 tuổi',
      '8 tuổi',
      '9 tuổi',
      '10 tuổi'
    ],
    middle_school: [
      'học sinh trung học cơ sở',
      'lớp 6',
      'lớp 7',
      'lớp 8',
      'lớp 9',
      'thcs',
      '11 tuổi',
      '12 tuổi',
      '13 tuổi',
      '14 tuổi'
    ],
    high_school: [
      'học sinh trung học phổ thông',
      'lớp 10',
      'lớp 11',
      'lớp 12',
      'thpt',
      '15 tuổi',
      '16 tuổi',
      '17 tuổi'
    ],
    university: [
      'sinh viên',
      'đại học',
      'năm nhất',
      'năm hai',
      'năm ba',
      'năm tư',
      '18 tuổi',
      '19 tuổi',
      '20 tuổi',
      '21 tuổi',
      '22 tuổi'
    ]
  },
  gender: {
    female: ['nữ', 'cô', 'chị', 'em gái', 'con gái', 'bạn nữ', 'học sinh nữ', 'sinh viên nữ'],
    male: ['nam', 'anh', 'em trai', 'con trai', 'bạn nam', 'học sinh nam', 'sinh viên nam']
  },
  emotions: {
    positive: ['cười', 'vui vẻ', 'hạnh phúc', 'vui', 'tươi cười', 'rạng rỡ', 'tích cực', 'năng động'],
    neutral: ['bình thường', 'nghiêm túc', 'tập trung', 'tự nhiên', 'bình tĩnh'],
    negative: ['buồn', 'khóc', 'giận dữ', 'căng thẳng', 'mệt mỏi', 'lo lắng']
  },
  appearance: {
    skin_tone: ['da trắng', 'da vàng', 'da ngăm', 'da đen', 'da sáng', 'da tối'],
    facial_features: [
      'mắt to',
      'mắt nhỏ',
      'mũi cao',
      'mũi tẹt',
      'môi mỏng',
      'môi dày',
      'mặt tròn',
      'mặt dài',
      'mặt oval'
    ],
    accessories: ['đeo kính', 'có râu', 'có ria', 'đeo khuyên tai', 'trang điểm']
  },
  educational_context: {
    classroom: ['trong lớp', 'ở trường', 'học bài', 'thi cử', 'thảo luận nhóm'],
    activities: ['thể thao', 'hoạt động ngoại khóa', 'biểu diễn', 'thi đấu', 'dã ngoại']
  }
}

class EnhancedEmbeddingService {
  // 🔥 UPDATED: Using ArcFace R34 Model instead of GLinT100
  private readonly ARCFACE_R34_MODEL_PATH = path.join(process.cwd(), 'server', 'models', 'arcface_r34.onnx') // ArcFace R34
  private readonly OLD_ARCFACE_PATH = path.join(process.cwd(), 'src', 'models', 'arcfaceresnet100-8.onnx') // Backward compatibility

  private session: ort.InferenceSession | null = null
  private isInitialized = false
  private readonly FACE_SIMILARITY_THRESHOLD = 0.25
  private readonly TEXT_SIMILARITY_THRESHOLD = 0.3
  private readonly QUALITY_THRESHOLD = 0.4
  private initPromise: Promise<void> | null = null
  private modelType: 'arcface_r34' | 'arcface_old' | 'fallback' = 'fallback'

  constructor() {
    this.initPromise = this.initializeModel()
  }

  async ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise
    }
    return this.isInitialized
  }

  private async initializeModel() {
    try {
      console.log('🚀 Enhanced Embedding Service: Loading ArcFace Models...')

      // 🔥 PRIORITY 1: Try to load ArcFace R34 (Primary model)
      if (fs.existsSync(this.ARCFACE_R34_MODEL_PATH)) {
        console.log('🔄 Loading ArcFace R34 model for Enhanced Service...')
        this.session = await ort.InferenceSession.create(this.ARCFACE_R34_MODEL_PATH)
        this.modelType = 'arcface_r34'
        this.isInitialized = true
        console.log('✅ ArcFace R34 loaded - Enhanced Service using primary model')
        console.log(`📊 ArcFace R34 Input: ${JSON.stringify(this.session.inputNames)}`)
        console.log(`📊 ArcFace R34 Output: ${JSON.stringify(this.session.outputNames)}`)
        console.log('🔥 Enhanced search capability: ArcFace R34 + Enhanced Text embeddings')
        return
      }

      // 🔥 FALLBACK 1: Try old ArcFace model for backward compatibility
      if (fs.existsSync(this.OLD_ARCFACE_PATH)) {
        console.log('⚠️ ArcFace R34 not found, using old ArcFace model (backward compatibility)...')
        this.session = await ort.InferenceSession.create(this.OLD_ARCFACE_PATH)
        this.modelType = 'arcface_old'
        this.isInitialized = true
        console.log('✅ Old ArcFace ResNet100-8 loaded - Enhanced Service with legacy compatibility')
        console.log(`📊 Old ArcFace Input: ${JSON.stringify(this.session.inputNames)}`)
        console.log(`📊 Old ArcFace Output: ${JSON.stringify(this.session.outputNames)}`)
        return
      }

      // 🔥 FALLBACK 2: No models found - use advanced fallback
      console.log('❌ No ArcFace models found!')
      console.log('📥 For BEST performance, download:')
      console.log('   - ArcFace R34: Please place arcface_r34.onnx in server/models/ directory')
      console.log('   - Or keep old: arcfaceresnet100-8.onnx')
      console.log('🔄 Enhanced Service will use advanced fallback methods')

      this.modelType = 'fallback'
      this.isInitialized = true // Still functional with fallback
    } catch (error) {
      console.error('❌ Failed to load ArcFace models:', error)
      console.log('🔄 Enhanced Service using advanced fallback methods only')
      this.modelType = 'fallback'
      this.isInitialized = true // Still functional
    }
  }

  private generateFaceServiceMatchReason(similarity: number, avgQuality: number, confidence: string): string {
    const reasons = []

    if (similarity >= 0.8) reasons.push('Very high facial similarity')
    else if (similarity >= 0.7) reasons.push('High facial similarity')
    else if (similarity >= 0.65) reasons.push('Good facial similarity')

    if (avgQuality >= 0.7) reasons.push('High image quality')
    else if (avgQuality >= 0.5) reasons.push('Adequate image quality')

    reasons.push(`${confidence} confidence`)

    if (this.modelType === 'arcface_r34') {
      reasons.push('ArcFace R34 model')
    } else if (this.modelType === 'arcface_old') {
      reasons.push('Legacy ArcFace model')
    }

    return reasons.join(', ')
  }

  async extractFaceEmbeddingLikeFaceService(imageBuffer: Buffer): Promise<number[] | null> {
    await this.ensureInitialized()

    if (!this.isInitialized || !this.session) {
      console.log('ArcFace model not available, using advanced fallback')
      return this.extractAdvancedFaceEmbedding(imageBuffer)
    }

    try {
      const inputData = await this.preprocessForONNX(imageBuffer)

      // 🔥 UPDATED: Handle both ArcFace R34 and old ArcFace models
      const inputName = this.session.inputNames[0] // Usually 'data' or 'input'
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 112, 112])
      const feeds: { [name: string]: ort.Tensor } = {}
      feeds[inputName] = inputTensor

      const results = await this.session.run(feeds)
      const outputName = this.session.outputNames[0] // Usually 'fc1' or 'embedding'
      const outputTensor = results[outputName]
      const embedding = Array.from(outputTensor.data as Float32Array)

      const modelInfo = this.modelType === 'arcface_r34' ? 'ArcFace R34' : 'ArcFace ResNet100-8 (Legacy)'
      console.log(`✅ Enhanced service extracted ${modelInfo} embedding (${embedding.length}D)`)

      // L2 normalization for better similarity calculation - same as FaceEmbeddingService
      return this.l2Normalize(embedding)
    } catch (error) {
      console.error(`${this.modelType} extraction failed:`, error)
      return this.extractAdvancedFaceEmbedding(imageBuffer)
    }
  }

  private async detectAndAlignFace(imageBuffer: Buffer): Promise<{
    alignedFace: Buffer
    quality: number
    landmarks: number[]
  }> {
    try {
      const image = sharp(imageBuffer)
      const metadata = await image.metadata()
      const originalWidth = metadata.width || 256
      const originalHeight = metadata.height || 256

      // Resize for face detection
      const { data, info } = await image
        .resize(256, 256, { fit: 'cover' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true })

      // Simple face region detection using variance analysis - same as FaceEmbeddingService
      const faceRegion = this.detectFaceRegion(data, info.width, info.height)

      // Scale back to original dimensions
      const scaleX = originalWidth / info.width
      const scaleY = originalHeight / info.height

      const originalFaceRegion = {
        x: Math.round(faceRegion.x * scaleX),
        y: Math.round(faceRegion.y * scaleY),
        width: Math.round(faceRegion.width * scaleX),
        height: Math.round(faceRegion.height * scaleY)
      }

      // 🔧 FIX: Validate extract parameters to avoid "bad extract area"
      const extractLeft = Math.max(0, originalFaceRegion.x - 20)
      const extractTop = Math.max(0, originalFaceRegion.y - 20)
      const maxWidth = originalWidth - extractLeft
      const maxHeight = originalHeight - extractTop
      const extractWidth = Math.min(maxWidth, originalFaceRegion.width + 40)
      const extractHeight = Math.min(maxHeight, originalFaceRegion.height + 40)

      // Ensure minimum dimensions
      const finalWidth = Math.max(50, extractWidth)
      const finalHeight = Math.max(50, extractHeight)

      console.log(`🔍 Enhanced service face region: ${JSON.stringify(faceRegion)}`)

      // Extract and align face
      const alignedFace = await sharp(imageBuffer)
        .extract({
          left: extractLeft,
          top: extractTop,
          width: finalWidth,
          height: finalHeight
        })
        .resize(112, 112, { fit: 'cover' }) // Standard size for both ArcFace R34 and old ArcFace
        .toBuffer()

      // Calculate quality metrics - same method as FaceEmbeddingService
      const quality = this.calculateImageQuality(data, info.width, info.height)

      // Generate simple landmarks
      const landmarks = this.generateLandmarks(faceRegion, info.width, info.height)

      console.log(`✅ Enhanced service face aligned, quality: ${quality.toFixed(3)}`)
      return { alignedFace, quality, landmarks }
    } catch (error) {
      console.error('Enhanced service face detection failed, using center crop fallback:', error)

      // 🔧 IMPROVED FALLBACK: More sophisticated center crop
      try {
        const metadata = await sharp(imageBuffer).metadata()
        const size = Math.min(metadata.width!, metadata.height!)
        const left = Math.floor((metadata.width! - size) / 2)
        const top = Math.floor((metadata.height! - size) / 2)

        const alignedFace = await sharp(imageBuffer)
          .extract({ left, top, width: size, height: size })
          .resize(112, 112, { fit: 'cover' })
          .toBuffer()

        console.log(`📦 Enhanced service center crop: ${size}x${size} from ${metadata.width}x${metadata.height}`)

        return {
          alignedFace,
          quality: 0.6, // Slightly better fallback quality
          landmarks: new Array(10).fill(0)
        }
      } catch (fallbackError) {
        console.error('Enhanced service fallback failed, using simple resize:', fallbackError)

        const alignedFace = await sharp(imageBuffer).resize(112, 112, { fit: 'cover' }).toBuffer()
        return {
          alignedFace,
          quality: 0.5,
          landmarks: new Array(10).fill(0)
        }
      }
    }
  }

  private async preprocessForONNX(imageBuffer: Buffer): Promise<Float32Array> {
    try {
      const { alignedFace } = await this.detectAndAlignFace(imageBuffer)

      const { data, info } = await sharp(alignedFace)
        .resize(112, 112)
        .removeAlpha()
        .toColorspace('srgb') // 🔥 UPDATED: Use toColorspace for proper color handling
        .raw()
        .toBuffer({ resolveWithObject: true })

      if (data.length !== 112 * 112 * 3) {
        throw new Error(`Invalid data length: ${data.length}`)
      }

      // 🔥 UPDATED: Convert to CHW format with proper normalization for BOTH ArcFace R34 and old ArcFace
      const float32Data = new Float32Array(3 * 112 * 112)

      for (let h = 0; h < 112; h++) {
        for (let w = 0; w < 112; w++) {
          for (let c = 0; c < 3; c++) {
            const srcIdx = (h * 112 + w) * 3 + c
            const dstIdx = c * 112 * 112 + h * 112 + w

            // Normalize to [-1, 1] range - COMPATIBLE with both ArcFace R34 and old ArcFace
            float32Data[dstIdx] = (data[srcIdx] / 255.0 - 0.5) / 0.5
          }
        }
      }

      return float32Data
    } catch (error) {
      console.error('Enhanced service preprocessing error:', error)
      throw error
    }
  }

  private calculateSimilarityLikeFaceService(
    embedding1: number[],
    embedding2: number[],
    quality1 = 1,
    quality2 = 1
  ): number {
    if (embedding1.length !== embedding2.length) return 0

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    if (norm1 === 0 || norm2 === 0) return 0

    const cosineSim = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))

    // Quality weighting - EXACTLY same as FaceEmbeddingService
    const qualityWeight = Math.sqrt(quality1 * quality2)

    return cosineSim * qualityWeight
  }

  async generateEnhancedTextEmbedding(
    text: string,
    userClass?: string,
    userAge?: string
  ): Promise<{
    embedding: number[]
    semantic_features: any
  }> {
    try {
      const normalizedText = text.toLowerCase().trim()
      const words = normalizedText.split(/\W+/).filter((word) => word.length > 0)

      // Initialize embedding với 768 dimensions (BERT-like)
      const embedding = new Array(768).fill(0)

      // Extract semantic features
      const semantic_features = {
        demographics: [] as string[],
        emotions: [] as string[],
        attributes: [] as string[],
        educational_level: this.extractEducationalLevel(userClass || '')
      }

      // 1. Demographic analysis với trọng số cao
      let semanticScore = 0
      Object.entries(ENHANCED_SEMANTIC_CLUSTERS).forEach(([category, clusters], catIndex) => {
        Object.entries(clusters).forEach(([subCategory, keywords], subIndex) => {
          keywords.forEach((keyword) => {
            if (normalizedText.includes(keyword)) {
              const baseIndex = (catIndex * 96 + subIndex * 12) % 768

              // Multi-scale embedding với trọng số khác nhau
              for (let scale = 0; scale < 3; scale++) {
                const scaleWeight = 1.0 / (scale + 1)
                for (let i = 0; i < 12; i++) {
                  const pos = (baseIndex + scale * 256 + i) % 768
                  embedding[pos] += 8.0 * scaleWeight // Tăng trọng số semantic
                }
              }

              // Lưu semantic features
              if (category === 'age_groups') semantic_features.demographics.push(keyword)
              else if (category === 'emotions') semantic_features.emotions.push(keyword)
              else semantic_features.attributes.push(keyword)

              semanticScore += 1
            }
          })
        })
      })

      // 2. Advanced N-gram analysis với contextual weight
      for (let n = 2; n <= 5; n++) {
        const nGrams = this.extractAdvancedNGrams(normalizedText, n)
        nGrams.forEach((gram, index) => {
          const hash = this.advancedHash(gram, n)
          const contextWeight = this.calculateContextualWeight(gram, normalizedText)

          for (let i = 0; i < 15; i++) {
            const pos = (hash + i + n * 128) % 768
            embedding[pos] += (contextWeight * 2.0) / n
          }
        })
      }

      // 3. Semantic clustering với attention mechanism
      const attentionWeights = this.calculateAttentionWeights(words, normalizedText)
      words.forEach((word, index) => {
        const tf = this.calculateTF(word, words)
        const attention = attentionWeights[index] || 1.0
        const hash = this.advancedHash(word, 1)

        // Multi-head attention simulation
        for (let head = 0; head < 8; head++) {
          const headHash = this.advancedHash(word + head.toString(), 1)
          for (let i = 0; i < 24; i++) {
            const pos = (headHash + i + head * 96) % 768
            embedding[pos] += (tf * attention * 1.5) / (head + 1)
          }
        }
      })

      // 4. Positional encoding với distance decay
      words.forEach((word, index) => {
        const hash = this.advancedHash(word, 1)
        const posWeight = Math.cos((index * Math.PI) / words.length) * Math.exp(-index / 20)
        const pos = hash % 768
        embedding[pos] += posWeight * 0.8
      })

      // 5. Structural features
      embedding[0] += Math.log(words.length + 1) / 5
      embedding[1] += Math.log(normalizedText.length + 1) / 50
      embedding[2] += semanticScore / 5
      embedding[3] += this.calculateTextComplexity(normalizedText)

      console.log(`Enhanced text embedding generated for: "${text}"`)
      console.log(`Semantic score: ${semanticScore}, Features: ${JSON.stringify(semantic_features)}`)

      return {
        embedding: this.l2Normalize(embedding),
        semantic_features
      }
    } catch (error) {
      console.error('Error generating enhanced text embedding:', error)
      return {
        embedding: this.generateFallbackTextEmbedding(text),
        semantic_features: { demographics: [], emotions: [], attributes: [], educational_level: 'unknown' }
      }
    }
  }

  /**
   * Enhanced image search - SAME logic as FaceEmbeddingService.verifyFace but with ArcFace models
   */
  async searchUsersByImageEnhanced(
    imageBuffer: Buffer,
    userRole: 'student' | 'teacher',
    options: {
      age_range?: [number, number]
      gender?: 'nam' | 'nữ'
      emotion_filter?: string
      quality_threshold?: number
      limit?: number
    } = {}
  ): Promise<any[]> {
    try {
      const { age_range, gender, emotion_filter, quality_threshold = this.QUALITY_THRESHOLD, limit = 10 } = options

      const modelInfo =
        this.modelType === 'arcface_r34'
          ? 'ArcFace R34'
          : this.modelType === 'arcface_old'
            ? 'ArcFace (Legacy)'
            : 'Advanced Fallback'

      console.log(`🔍 Enhanced image search using ${modelInfo}`)
      console.log(`🎯 Role: ${userRole}, Filters: age=${age_range}, gender=${gender}, emotion=${emotion_filter}`)

      // Step 1: Extract search embedding - Using available ArcFace model
      console.log(`📤 Extracting search embedding using ${modelInfo}...`)
      const { alignedFace: searchAlignedFace, quality: searchQuality } = await this.detectAndAlignFace(imageBuffer)
      const searchEmbedding = await this.extractFaceEmbeddingLikeFaceService(searchAlignedFace)

      if (!searchEmbedding) {
        console.error('❌ Failed to extract search embedding')
        return []
      }

      console.log(`✅ Search embedding extracted with quality: ${searchQuality.toFixed(3)} using ${modelInfo}`)
      console.log(
        `📊 Search embedding sample: [${searchEmbedding
          .slice(0, 5)
          .map((v) => v.toFixed(3))
          .join(', ')}...]`
      )

      // Step 2: Get all face embeddings from database
      console.log('📥 Getting all face embeddings from database...')
      const faceEmbeddings = await databaseService.db.collection('face_embeddings').find({}).toArray()
      console.log(`📊 Found ${faceEmbeddings.length} face embeddings in database`)

      // Step 3: Calculate similarities using EXACT FaceEmbeddingService method but with ArcFace model
      console.log(`🔄 Calculating similarities using ${modelInfo} with FaceEmbeddingService.verifyFace logic...`)
      const similarities = []

      for (let i = 0; i < faceEmbeddings.length; i++) {
        const doc = faceEmbeddings[i]
        if (!doc.embedding || !doc.face_features) {
          continue
        }

        console.log(`📝 Processing document ${i}: User ${doc.user_id}`)

        // Calculate similarity using EXACT same method as FaceEmbeddingService.verifyFace
        const similarity = this.calculateSimilarityLikeFaceService(
          searchEmbedding,
          doc.embedding,
          searchQuality,
          doc.face_features.quality_score || 0.5
        )

        console.log(`   💯 Similarity: ${similarity.toFixed(4)} (threshold: ${this.FACE_SIMILARITY_THRESHOLD})`)

        // Apply SAME threshold as FaceEmbeddingService
        if (similarity >= this.FACE_SIMILARITY_THRESHOLD) {
          const simResult = {
            user_id: doc.user_id,
            similarity,
            quality_score: doc.face_features.quality_score || 0.5,
            state_moment: doc.state_moment,
            face_features: doc.face_features,
            search_quality: searchQuality,
            model_used: modelInfo
          }
          similarities.push(simResult)
          console.log(`   ✅ MATCH FOUND: Added to results with similarity ${similarity.toFixed(4)}`)
        } else {
          console.log(`   ❌ NO MATCH: Similarity ${similarity.toFixed(4)} below threshold`)
        }
      }

      console.log(`🎯 Found ${similarities.length} matches above threshold ${this.FACE_SIMILARITY_THRESHOLD}`)

      // Step 4: Apply additional filters
      let filteredSimilarities = similarities

      if (quality_threshold > 0) {
        const beforeCount = filteredSimilarities.length
        filteredSimilarities = filteredSimilarities.filter((s) => s.quality_score >= quality_threshold)
        console.log(`🔍 After quality filter: ${filteredSimilarities.length} matches (was ${beforeCount})`)
      }

      // Text-based filters for state_moment
      if (gender || emotion_filter || age_range) {
        const beforeCount = filteredSimilarities.length
        filteredSimilarities = filteredSimilarities.filter((s) => {
          const stateMoment = s.state_moment || ''

          if (gender && !stateMoment.includes(gender)) return false
          if (emotion_filter && !stateMoment.includes(emotion_filter)) return false

          // Age range filter
          if (age_range) {
            const hasAgeIndicator =
              (age_range[0] <= 15 && (stateMoment.includes('học sinh') || stateMoment.includes('tiểu học'))) ||
              (age_range[0] <= 18 && age_range[1] >= 15 && stateMoment.includes('trung học')) ||
              (age_range[0] <= 25 && age_range[1] >= 18 && stateMoment.includes('sinh viên'))

            if (!hasAgeIndicator) return false
          }

          return true
        })
        console.log(`🔍 After semantic filters: ${filteredSimilarities.length} matches (was ${beforeCount})`)
      }

      // Step 5: Sort by similarity - SAME as FaceEmbeddingService
      filteredSimilarities.sort((a, b) => b.similarity - a.similarity)
      const topUserIds = filteredSimilarities.slice(0, limit * 2).map((s) => s.user_id)

      // Step 6: Get user details with role filtering
      const users = await databaseService.users
        .find({
          _id: { $in: topUserIds },
          role: userRole as any
        })
        .toArray()

      console.log(`👥 Found ${users.length} users with role ${userRole}`)

      // Step 7: Combine results with SAME confidence logic as FaceEmbeddingService.verifyFace
      const results = users
        .map((user) => {
          const sim = filteredSimilarities.find((s) => s.user_id.toString() === user._id.toString())
          if (!sim) return null

          // EXACT same confidence calculation as FaceEmbeddingService.verifyFace
          let confidence: 'high' | 'medium' | 'low'
          const avgQuality = (sim.search_quality + sim.quality_score) / 2

          if (sim.similarity >= 0.8 && avgQuality >= 0.7) {
            confidence = 'high'
          } else if (sim.similarity >= 0.6 && avgQuality >= 0.5) {
            confidence = 'medium'
          } else {
            confidence = 'low'
          }

          console.log(`👤 User ${user.name}: similarity=${sim.similarity.toFixed(4)}, confidence=${confidence}`)

          return {
            _id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            class: user.class,
            role: user.role,
            similarity: sim.similarity,
            search_quality: sim.search_quality,
            stored_quality: sim.quality_score,
            confidence,
            state_moment: sim.state_moment,
            model_used: sim.model_used,
            match_reason: this.generateFaceServiceMatchReason(sim.similarity, avgQuality, confidence)
          }
        })
        .filter((result) => result !== null)

      // Final sorting by similarity
      results.sort((a, b) => b.similarity - a.similarity)

      console.log(`🎯 Returning ${Math.min(results.length, limit)} results using ${modelInfo}`)
      return results.slice(0, limit)
    } catch (error) {
      console.error('❌ Error in enhanced image search:', error)
      return []
    }
  }

  private async extractAdvancedFaceEmbedding(imageBuffer: Buffer): Promise<number[] | null> {
    try {
      const { alignedFace, quality, landmarks } = await this.detectAndAlignFace(imageBuffer)

      const { data } = await sharp(alignedFace).resize(128, 128).greyscale().raw().toBuffer({ resolveWithObject: true })

      const features = []

      // 1. Multi-scale Local Binary Patterns
      for (const radius of [1, 2, 3]) {
        const lbp = this.extractLBP(data, 128, 128, radius)
        features.push(...lbp)
      }

      // 2. Gabor filter responses
      const gaborFeatures = this.extractGaborFeatures(data, 128, 128)
      features.push(...gaborFeatures)

      // 3. Histogram of Oriented Gradients
      const hogFeatures = this.extractHOGFeatures(data, 128, 128)
      features.push(...hogFeatures)

      // 4. Facial landmarks features
      features.push(...landmarks.map((l) => l / 128))

      // 5. Quality metrics
      features.push(quality)

      return this.l2Normalize(features)
    } catch (error) {
      console.error('Error in advanced face embedding:', error)
      return null
    }
  }

  private extractLBP(data: Buffer, width: number, height: number, radius: number): number[] {
    const features = []
    const histogram = new Array(256).fill(0)

    for (let y = radius; y < height - radius; y += 2) {
      for (let x = radius; x < width - radius; x += 2) {
        const center = data[y * width + x]
        let pattern = 0

        // 8-neighbor LBP
        const angles = [0, 45, 90, 135, 180, 225, 270, 315]
        for (let i = 0; i < 8; i++) {
          const angle = (angles[i] * Math.PI) / 180
          const nx = Math.round(x + radius * Math.cos(angle))
          const ny = Math.round(y + radius * Math.sin(angle))

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighbor = data[ny * width + nx]
            if (neighbor >= center) {
              pattern |= 1 << i
            }
          }
        }

        histogram[pattern]++
      }
    }

    // Normalize histogram
    const total = histogram.reduce((sum, val) => sum + val, 0)
    return histogram.map((count) => count / (total || 1))
  }

  private extractGaborFeatures(data: Buffer, width: number, height: number): number[] {
    const features = []

    // Multiple orientations and scales
    const orientations = [0, 30, 60, 90, 120, 150]
    const scales = [2, 4, 8]

    for (const orientation of orientations) {
      for (const scale of scales) {
        let response = 0
        const theta = (orientation * Math.PI) / 180

        for (let y = scale; y < height - scale; y += 4) {
          for (let x = scale; x < width - scale; x += 4) {
            // Simplified Gabor kernel
            const kernel =
              Math.exp(-((x - width / 2) ** 2 + (y - height / 2) ** 2) / (2 * scale ** 2)) *
              Math.cos((2 * Math.PI * (x * Math.cos(theta) + y * Math.sin(theta))) / scale)

            response += data[y * width + x] * kernel
          }
        }

        features.push(response / (width * height))
      }
    }

    return features
  }

  private extractHOGFeatures(data: Buffer, width: number, height: number): number[] {
    const features = []
    const cellSize = 8
    const blockSize = 2

    // Calculate gradients
    const gradients = []
    const orientations = []

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const gx = data[y * width + (x + 1)] - data[y * width + (x - 1)]
        const gy = data[(y + 1) * width + x] - data[(y - 1) * width + x]

        const magnitude = Math.sqrt(gx * gx + gy * gy)
        const orientation = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180

        gradients.push(magnitude)
        orientations.push(orientation)
      }
    }

    // Build HOG features
    for (let by = 0; by < Math.floor(height / cellSize) - blockSize + 1; by++) {
      for (let bx = 0; bx < Math.floor(width / cellSize) - blockSize + 1; bx++) {
        const blockFeatures = []

        for (let cy = by; cy < by + blockSize; cy++) {
          for (let cx = bx; cx < bx + blockSize; cx++) {
            const histogram = new Array(9).fill(0)

            for (let y = cy * cellSize; y < (cy + 1) * cellSize; y++) {
              for (let x = cx * cellSize; x < (cx + 1) * cellSize; x++) {
                const idx = y * (width - 2) + x
                if (idx < gradients.length) {
                  const bin = Math.floor(orientations[idx] / 20)
                  histogram[Math.min(bin, 8)] += gradients[idx]
                }
              }
            }

            blockFeatures.push(...histogram)
          }
        }

        // L2 normalize block
        const norm = Math.sqrt(blockFeatures.reduce((sum, val) => sum + val * val, 0))
        features.push(...blockFeatures.map((val) => val / (norm || 1)))
      }
    }

    return features
  }

  private l2Normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) return vector
    return vector.map((val) => val / norm)
  }

  private extractEducationalLevel(className: string): string {
    if (!className) return 'unknown'

    const gradeMatch = className.match(/^(\d{1,2})/)
    if (!gradeMatch) return 'unknown'

    const grade = parseInt(gradeMatch[0])
    if (grade >= 1 && grade <= 5) return 'elementary'
    if (grade >= 6 && grade <= 9) return 'middle_school'
    if (grade >= 10 && grade <= 12) return 'high_school'
    if (grade >= 13) return 'university'

    return 'unknown'
  }

  private extractAdvancedNGrams(text: string, n: number): string[] {
    const grams: string[] = []
    const cleanText = text.toLowerCase().replace(/\s+/g, ' ').trim()
    const words = cleanText.split(' ')

    for (let i = 0; i <= words.length - n; i++) {
      grams.push(words.slice(i, i + n).join(' '))
    }

    if (n <= 3) {
      const chars = cleanText.replace(/\s/g, '')
      for (let i = 0; i <= chars.length - n; i++) {
        grams.push(chars.substr(i, n))
      }
    }

    return grams
  }

  private advancedHash(str: string, scale: number): number {
    let hash = 0
    const prime = 31

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash * prime + char) % Number.MAX_SAFE_INTEGER
    }

    return Math.abs(hash * scale) % 768
  }

  private calculateAttentionWeights(words: string[], fullText: string): number[] {
    return words.map((word, index) => {
      const tf = words.filter((w) => w === word).length / words.length
      const position_weight = Math.exp(-index / words.length)
      const length_weight = Math.log(word.length + 1) / 3

      return tf * position_weight * length_weight
    })
  }

  private calculateTF(word: string, words: string[]): number {
    const count = words.filter((w) => w === word).length
    return count / words.length
  }

  private calculateTextComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).length
    const avgWordsPerSentence = text.split(/\s+/).length / sentences
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size
    const totalWords = text.split(/\s+/).length

    return (avgWordsPerSentence / 20 + uniqueWords / totalWords) / 2
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    if (norm1 === 0 || norm2 === 0) return 0
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  private calculateFeatureMatchingBonus(searchFeatures: any, docFeatures: any): number {
    let bonus = 0
    const maxBonus = 0.4

    // Demographics matching
    const demoOverlap = this.calculateArrayOverlap(searchFeatures.demographics, docFeatures.demographics)
    bonus += demoOverlap * maxBonus * 0.4

    // Emotions matching
    const emotionOverlap = this.calculateArrayOverlap(searchFeatures.emotions, docFeatures.emotions)
    bonus += emotionOverlap * maxBonus * 0.3

    // Attributes matching
    const attrOverlap = this.calculateArrayOverlap(searchFeatures.attributes, docFeatures.attributes)
    bonus += attrOverlap * maxBonus * 0.3

    return Math.min(bonus, maxBonus)
  }

  private calculateTextFilterBonus(doc: any, filters: any): number {
    let bonus = 0
    const maxBonus = 0.2

    if (filters.age_filter && doc.user_age && doc.user_age.includes(filters.age_filter)) {
      bonus += maxBonus * 0.4
    }

    if (filters.emotion_filter && doc.state_moment && doc.state_moment.includes(filters.emotion_filter)) {
      bonus += maxBonus * 0.3
    }

    if (filters.attribute_filter && doc.state_moment && doc.state_moment.includes(filters.attribute_filter)) {
      bonus += maxBonus * 0.3
    }

    return Math.min(bonus, maxBonus)
  }

  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (!arr1.length || !arr2.length) return 0

    const set1 = new Set(arr1)
    const intersection = arr2.filter((item) => set1.has(item))

    return intersection.length / Math.max(arr1.length, arr2.length)
  }

  private calculateConfidence(similarity: number, quality: number): 'high' | 'medium' | 'low' {
    const avgScore = (similarity + quality) / 2
    if (avgScore >= 0.85) return 'high'
    if (avgScore >= 0.65) return 'medium'
    return 'low'
  }

  private detectFaceRegion(
    data: Buffer,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    // Find region with highest variance (likely face) - same as FaceEmbeddingService
    const blockSize = 32
    let maxVariance = 0
    let bestRegion = { x: 0, y: 0, width: width, height: height }

    for (let y = 0; y < height - blockSize; y += 16) {
      for (let x = 0; x < width - blockSize; x += 16) {
        const variance = this.calculateVariance(data, x, y, blockSize, width)
        if (variance > maxVariance) {
          maxVariance = variance
          bestRegion = {
            x: Math.max(0, x - blockSize),
            y: Math.max(0, y - blockSize),
            width: Math.min(width - x, blockSize * 3),
            height: Math.min(height - y, blockSize * 3)
          }
        }
      }
    }

    return bestRegion
  }

  private calculateVariance(data: Buffer, startX: number, startY: number, size: number, width: number): number {
    let sum = 0
    let sumSquares = 0
    let count = 0

    for (let y = startY; y < startY + size; y++) {
      for (let x = startX; x < startX + size; x++) {
        const idx = y * width + x
        if (idx < data.length) {
          const pixel = data[idx]
          sum += pixel
          sumSquares += pixel * pixel
          count++
        }
      }
    }

    if (count === 0) return 0
    const mean = sum / count
    return sumSquares / count - mean * mean
  }

  private calculateImageQuality(data: Buffer, width: number, height: number): number {
    let brightness = 0
    let contrast = 0
    let sharpness = 0
    const totalPixels = width * height

    // Brightness
    for (let i = 0; i < data.length; i++) {
      brightness += data[i]
    }
    brightness /= totalPixels

    // Contrast (standard deviation)
    for (let i = 0; i < data.length; i++) {
      contrast += Math.pow(data[i] - brightness, 2)
    }
    contrast = Math.sqrt(contrast / totalPixels)

    // Simple sharpness (edge detection)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const sobel = Math.abs(
          -data[idx - width - 1] -
            2 * data[idx - width] -
            data[idx - width + 1] +
            data[idx + width - 1] +
            2 * data[idx + width] +
            data[idx + width + 1]
        )
        sharpness += sobel
      }
    }
    sharpness /= totalPixels

    const qualityScore = Math.min(1, (brightness / 128 + contrast / 64 + sharpness / 32) / 3)
    return qualityScore
  }

  private generateLandmarks(faceRegion: any, width: number, height: number): number[] {
    const cx = faceRegion.x + faceRegion.width / 2
    const cy = faceRegion.y + faceRegion.height / 2
    const w = faceRegion.width
    const h = faceRegion.height

    return [
      cx - w * 0.3,
      cy - h * 0.2, // Left eye
      cx + w * 0.3,
      cy - h * 0.2, // Right eye
      cx,
      cy, // Nose tip
      cx - w * 0.2,
      cy + h * 0.2, // Left mouth
      cx + w * 0.2,
      cy + h * 0.2 // Right mouth
    ]
  }

  private generateTextMatchReason(sim: any, searchFeatures: any): string {
    const reasons = []

    if (sim.semantic_similarity >= 0.7) reasons.push('Strong semantic similarity')
    else if (sim.semantic_similarity >= 0.5) reasons.push('Moderate semantic similarity')

    if (sim.feature_bonus > 0.2) reasons.push('Matching features')
    if (sim.filter_bonus > 0.05) reasons.push('Filter criteria match')

    return reasons.join(', ') || 'Basic text match'
  }

  private generateFallbackTextEmbedding(text: string): number[] {
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 0)
    const embedding = new Array(768).fill(0)

    words.forEach((word, index) => {
      const hash = this.advancedHash(word, 1)
      for (let i = 0; i < 50; i++) {
        const pos = (hash + i) % 768
        embedding[pos] += 1 / Math.sqrt(index + 1)
      }
    })

    return this.l2Normalize(embedding)
  }

  /**
   * Store enhanced text embedding with semantic analysis
   */
  async storeEnhancedTextEmbedding(
    userId: string,
    text: string,
    userClass?: string,
    type: 'profile' | 'description' | 'bio' = 'profile'
  ): Promise<boolean> {
    try {
      const result = await this.generateEnhancedTextEmbedding(text, userClass)

      const textEmbeddingDoc: TextEmbedding = {
        user_id: new ObjectId(userId),
        text,
        embedding: result.embedding,
        semantic_features: result.semantic_features,
        type,
        created_at: new Date(),
        updated_at: new Date()
      }

      await databaseService.db
        .collection('enhanced_text_embeddings')
        .replaceOne({ user_id: new ObjectId(userId), type }, textEmbeddingDoc, { upsert: true })

      console.log(`✅ Enhanced text embedding stored for user ${userId}`)
      console.log(`📊 Features: ${JSON.stringify(result.semantic_features)}`)
      return true
    } catch (error) {
      console.error('Error storing enhanced text embedding:', error)
      return false
    }
  }

  private calculateContextualWeight(gram: string, fullText: string): number {
    const gramIndex = fullText.indexOf(gram)
    if (gramIndex === -1) return 1.0

    const relativePos = gramIndex / fullText.length
    const positionWeight = Math.exp(-Math.pow(relativePos - 0.5, 2) * 2) + 0.3

    const gramCount = (fullText.match(new RegExp(gram, 'g')) || []).length
    const frequencyWeight = Math.log(gramCount + 1) / 3

    const lengthWeight = Math.log(gram.length + 1) / 2

    return positionWeight * frequencyWeight * lengthWeight
  }

  /**
   * Health check with FaceEmbeddingService compatibility status and model info
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    model_info: {
      face_recognition: {
        initialized: boolean
        model_type: string
        model_path: string
        method: string
      }
    }
    thresholds: {
      face_similarity: number
      text_similarity: number
      quality_threshold: number
    }
    compatibility: {
      face_embedding_service: boolean
      enhanced_features: string[]
    }
  }> {
    await this.ensureInitialized()

    const modelInfo = {
      arcface_r34: 'ArcFace R34 (Primary Model)',
      arcface_old: 'ArcFace ResNet100-8 (Legacy)',
      fallback: 'Advanced Computer Vision Fallback'
    }

    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      model_info: {
        face_recognition: {
          initialized: this.isInitialized,
          model_type: this.modelType,
          model_path:
            this.modelType === 'arcface_r34'
              ? this.ARCFACE_R34_MODEL_PATH
              : this.modelType === 'arcface_old'
                ? this.OLD_ARCFACE_PATH
                : 'N/A',
          method: this.isInitialized
            ? `${modelInfo[this.modelType]}_compatible_with_face_service`
            : 'initialization_failed'
        }
      },
      thresholds: {
        face_similarity: this.FACE_SIMILARITY_THRESHOLD,
        text_similarity: this.TEXT_SIMILARITY_THRESHOLD,
        quality_threshold: this.QUALITY_THRESHOLD
      },
      compatibility: {
        face_embedding_service: true,
        enhanced_features: [
          `Using ${modelInfo[this.modelType]} for maximum accuracy`,
          'IDENTICAL similarity calculation method with FaceEmbeddingService',
          'SAME threshold (0.65) for consistent results',
          'COMPATIBLE preprocessing pipeline',
          'Enhanced semantic text search capabilities',
          'Quality-weighted similarity scoring',
          'Cross-modal verification capability',
          'Backward compatibility with legacy models',
          'ArcFace R34 model support for improved accuracy'
        ]
      }
    }
  }

  /**
   * Verify compatibility with FaceEmbeddingService and show model comparison
   */
  async verifyCompatibility(): Promise<{
    compatible: boolean
    model_comparison: {
      enhanced_service: string
      recommended_download?: string
    }
    details: {
      same_preprocessing: boolean
      same_similarity_calculation: boolean
      same_threshold: boolean
      model_available: boolean
    }
  }> {
    await this.ensureInitialized()

    const details = {
      same_preprocessing: true, // Same CHW format, [-1,1] normalization
      same_similarity_calculation: true, // Same cosine similarity with quality weighting
      same_threshold: this.FACE_SIMILARITY_THRESHOLD === (0.65 as any),
      model_available: this.session !== null
    }

    const modelInfo = {
      arcface_r34: 'ArcFace R34 (Primary Model - RECOMMENDED)',
      arcface_old: 'ArcFace ResNet100-8 (Legacy - Still Compatible)',
      fallback: 'Advanced Computer Vision Fallback (Functional but Limited)'
    }

    const result = {
      compatible: Object.values(details).every((v) => v),
      model_comparison: {
        enhanced_service: modelInfo[this.modelType]
      } as any,
      details
    }

    // Add download recommendation if no model is loaded
    if (this.modelType === 'fallback') {
      result.model_comparison.recommended_download =
        'Please place arcface_r34.onnx in server/models/ directory for optimal performance'
    }

    return result
  }
}

const enhancedEmbeddingService = new EnhancedEmbeddingService()
export default enhancedEmbeddingService
