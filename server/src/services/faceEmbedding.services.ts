import * as ort from 'onnxruntime-node'
import sharp from 'sharp'
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { envConfig } from '../constants/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { uploadFileS3, sendFileFromS3 } from '~/utils/s3'
import { S3 } from '@aws-sdk/client-s3'

interface FaceDetection {
  bbox: [number, number, number, number] // [x1, y1, x2, y2]
  landmarks: number[] // 5 keypoints: [x1,y1, x2,y2, x3,y3, x4,y4, x5,y5]
  confidence: number
}

interface FaceAnalysis {
  detection: FaceDetection
  age: number
  gender: 'nam' | 'nữ'
  genderConfidence: number
  embedding: number[]
  alignedFace: Buffer
  quality: number
}

interface FaceEmbedding {
  _id?: ObjectId
  user_id: ObjectId
  embedding: number[]
  face_features: {
    landmarks: number[]
    quality_score: number
    brightness: number
    contrast: number
    detection_confidence: number
  }
  state_moment?: string
  user_age?: string
  reference_image_url?: string
  created_at: Date
  updated_at: Date
}

class CompleteFaceAnalysisService {
  // 🔥 THREE SPECIALIZED MODELS - Each with specific purpose
  private readonly SCRFD_MODEL_PATH = path.join(process.cwd(), 'models', 'scrfd_10g_bnkps.onnx') // Face Detection + Landmarks
  private readonly GENDERAGE_MODEL_PATH = path.join(process.cwd(), 'models', 'genderage.onnx') // Gender + Age
  private readonly W600K_MBF_MODEL_PATH = path.join(process.cwd(), 'models', 'w600k_mbf.onnx') // Face Recognition

  // Model sessions
  private scrfdSession: ort.InferenceSession | null = null // Face detection
  private genderAgeSession: ort.InferenceSession | null = null // Gender/Age
  private embeddingSession: ort.InferenceSession | null = null // Face recognition

  private isInitialized = false
  private readonly FACE_CONFIDENCE_THRESHOLD = 0.3 // Lowered from 0.5 for testing
  private readonly SIMILARITY_THRESHOLD = 0.65

  private initPromise: Promise<void> | null = null
  private genAI: GoogleGenerativeAI
  private geminiModel: any

  // S3 client for downloading reference images
  private s3: S3

  constructor() {
    this.initPromise = this.initializeAllModels()
    this.genAI = new GoogleGenerativeAI(process.env.GERMINI_API_KEY as string)
    this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    // Initialize S3 client
    this.s3 = new S3({
      region: envConfig.region,
      credentials: {
        secretAccessKey: envConfig.secretAccessKey as string,
        accessKeyId: envConfig.accessKeyId as string
      }
    })
  }

  async ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise
    }
    return this.isInitialized
  }

  private async initializeAllModels() {
    try {
      console.log('🚀 Loading Complete InsightFace Pipeline (3 Models)...')

      // 1. SCRFD Face Detection Model
      await this.loadSCRFDModel()

      // 2. GenderAge Model
      await this.loadGenderAgeModel()

      // 3. W600K MBF Recognition Model
      await this.loadW600kMbfModel()

      this.isInitialized = true
      console.log('🎉 Complete InsightFace Pipeline loaded successfully!')
    } catch (error) {
      console.error('❌ Failed to load InsightFace models:', error)
      throw error
    }
  }

  private async loadW600kMbfModel() {
    console.log(`🔍 Loading W600K MBF model from: ${this.W600K_MBF_MODEL_PATH}`)

    if (!fs.existsSync(this.W600K_MBF_MODEL_PATH)) {
      throw new Error(`W600K MBF model not found at: ${this.W600K_MBF_MODEL_PATH}`)
    }

    const stats = fs.statSync(this.W600K_MBF_MODEL_PATH)
    console.log(`📊 Model file size: ${this.formatBytes(stats.size)}`)

    try {
      this.embeddingSession = await ort.InferenceSession.create(this.W600K_MBF_MODEL_PATH)
      console.log('✅ W600K MBF Face Recognition model loaded successfully')
      console.log(`📊 W600K MBF Input: ${JSON.stringify(this.embeddingSession.inputNames)}`)
      console.log(`📊 W600K MBF Output: ${JSON.stringify(this.embeddingSession.outputNames)}`)
    } catch (loadError) {
      console.error('❌ Failed to load W600K MBF model:', loadError)
      throw new Error('W600K MBF model cannot be loaded by ONNX Runtime')
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 🔥 STEP 1: SCRFD Face Detection Model
  private async loadSCRFDModel() {
    if (!fs.existsSync(this.SCRFD_MODEL_PATH)) {
      console.log('❌ SCRFD model not found at:', this.SCRFD_MODEL_PATH)
      console.log('⚠️ SCRFD model not available, will use fallback detection')
      return // Not critical, we have fallback
    }

    this.scrfdSession = await ort.InferenceSession.create(this.SCRFD_MODEL_PATH)
    console.log('✅ SCRFD Face Detection model loaded')
    console.log(`📊 SCRFD Input: ${JSON.stringify(this.scrfdSession.inputNames)}`)
    console.log(`📊 SCRFD Output: ${JSON.stringify(this.scrfdSession.outputNames)}`)
  }

  // 🔥 STEP 2: GenderAge Model
  private async loadGenderAgeModel() {
    if (!fs.existsSync(this.GENDERAGE_MODEL_PATH)) {
      console.log('❌ GenderAge model not found at:', this.GENDERAGE_MODEL_PATH)
      console.log('⚠️ Will use Computer Vision fallback for gender/age detection')
      return // Not critical, we have CV fallback
    }

    this.genderAgeSession = await ort.InferenceSession.create(this.GENDERAGE_MODEL_PATH)
    console.log('✅ GenderAge model loaded')
    console.log(`📊 GenderAge Input: ${JSON.stringify(this.genderAgeSession.inputNames)}`)
    console.log(`📊 GenderAge Output: ${JSON.stringify(this.genderAgeSession.outputNames)}`)
  }

  // 🎯 MAIN PIPELINE: Complete Face Analysis
  async analyzeImageComplete(imageBuffer: Buffer): Promise<FaceAnalysis[]> {
    await this.ensureInitialized()

    try {
      console.log('🔍 Starting Complete Face Analysis Pipeline...')

      // STEP 1: Detect all faces using SCRFD
      const detections = await this.detectFacesWithSCRFD(imageBuffer)
      console.log(`📊 SCRFD detected ${detections.length} faces`)

      if (detections.length === 0) {
        console.log('❌ No faces detected')
        return []
      }

      const results: FaceAnalysis[] = []

      // STEP 2: Process each detected face
      for (let i = 0; i < detections.length; i++) {
        const detection = detections[i]
        console.log(`🔄 Processing face ${i + 1}/${detections.length}...`)

        try {
          // STEP 2a: Crop and align face using landmarks
          const alignedFace = await this.cropAndAlignFace(imageBuffer, detection)

          // STEP 2b: Gender/Age estimation
          const { age, gender, confidence: genderConfidence } = await this.estimateGenderAge(alignedFace)

          // STEP 2c: Face recognition embedding
          const embedding = await this.extractFaceEmbedding(alignedFace)

          // STEP 2d: Quality assessment
          const quality = await this.assessFaceQuality(alignedFace)

          const analysis: FaceAnalysis = {
            detection,
            age,
            gender,
            genderConfidence,
            embedding,
            alignedFace,
            quality
          }

          results.push(analysis)
          console.log(`✅ Face ${i + 1} analyzed: ${gender}, ${age} years, quality: ${quality.toFixed(3)}`)
        } catch (error) {
          console.error(`❌ Failed to analyze face ${i + 1}:`, error)
          continue
        }
      }

      console.log(`🎉 Complete analysis finished: ${results.length} faces processed`)
      return results
    } catch (error) {
      console.error('❌ Complete face analysis failed:', error)
      return []
    }
  }

  // 🔥 STEP 1: SCRFD Face Detection + Landmarks
  // 🔥 UPDATED: SCRFD Face Detection + Landmarks with improved parsing
  private async detectFacesWithSCRFD(imageBuffer: Buffer): Promise<FaceDetection[]> {
    if (!this.scrfdSession) {
      console.log('⚠️ SCRFD model not available, using fallback detection')
      return await this.fallbackFaceDetection(imageBuffer)
    }

    try {
      // Get original image dimensions first
      const imageInfo = await sharp(imageBuffer).metadata()
      const originalWidth = imageInfo.width || 640
      const originalHeight = imageInfo.height || 640

      console.log(`📏 Original image: ${originalWidth}x${originalHeight}`)

      // Preprocess image for SCRFD (640x640)
      const { data, info } = await sharp(imageBuffer)
        .resize(640, 640, { fit: 'fill' }) // SCRFD expects specific size
        .toColorspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true })

      // Convert to CHW format for SCRFD
      const inputData = new Float32Array(3 * 640 * 640)
      for (let h = 0; h < 640; h++) {
        for (let w = 0; w < 640; w++) {
          for (let c = 0; c < 3; c++) {
            const srcIdx = (h * 640 + w) * 3 + c
            const dstIdx = c * 640 * 640 + h * 640 + w
            inputData[dstIdx] = data[srcIdx] / 255.0 // Normalize to [0, 1]
          }
        }
      }

      console.log('🔄 Running SCRFD inference...')

      // Run SCRFD inference
      const inputName = this.scrfdSession.inputNames[0]
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 640, 640])
      const feeds: { [name: string]: ort.Tensor } = {}
      feeds[inputName] = inputTensor

      const results = await this.scrfdSession.run(feeds)

      console.log(`✅ SCRFD inference completed, parsing outputs...`)

      // Parse SCRFD outputs with improved logic
      const detections = this.parseSCRFDOutputs(results, originalWidth, originalHeight)

      if (detections.length === 0) {
        console.log('⚠️ SCRFD parsing found no valid faces, trying fallback detection...')

        // 🔥 FALLBACK: If SCRFD fails, use computer vision fallback
        const fallbackDetections = await this.fallbackFaceDetection(imageBuffer)

        if (fallbackDetections.length > 0) {
          console.log(`✅ Fallback detection successful: ${fallbackDetections.length} faces`)
          return fallbackDetections
        } else {
          console.log('❌ Both SCRFD and fallback detection failed')
          return []
        }
      }

      console.log(`🔍 SCRFD successful: ${detections.length} faces detected`)

      // 🔥 VALIDATION: Additional validation and filtering
      const validDetections = detections.filter((detection) => {
        const [x1, y1, x2, y2] = detection.bbox
        const width = x2 - x1
        const height = y2 - y1
        const area = width * height
        const imageArea = originalWidth * originalHeight

        // Filter out detections that are too small or too large
        const minArea = imageArea * 0.001 // At least 0.1% of image
        const maxArea = imageArea * 0.8 // At most 80% of image

        const isValidSize = area >= minArea && area <= maxArea
        const isValidRatio = width / height >= 0.5 && width / height <= 2.0 // Reasonable face ratio

        if (!isValidSize || !isValidRatio) {
          console.log(
            `🚫 Filtered detection: size=${area.toFixed(0)} (${minArea.toFixed(0)}-${maxArea.toFixed(0)}), ratio=${(width / height).toFixed(2)}`
          )
          return false
        }

        return true
      })

      console.log(`✅ Final validation: ${validDetections.length}/${detections.length} detections passed`)

      return validDetections
    } catch (error) {
      console.error('SCRFD detection failed, using fallback:', error)
      return await this.fallbackFaceDetection(imageBuffer)
    }
  }

  // 🔥 ENHANCED: Better fallback detection
  private async fallbackFaceDetection(imageBuffer: Buffer): Promise<FaceDetection[]> {
    try {
      console.log('🎯 Using enhanced fallback face detection...')

      const { data, info } = await sharp(imageBuffer).toColorspace('srgb').raw().toBuffer({ resolveWithObject: true })

      const { width, height } = info

      // 🔥 IMPROVED: Multiple detection strategies for fallback
      const strategies = [
        // Strategy 1: Center-weighted detection
        () => {
          const faceWidth = Math.floor(width * 0.6)
          const faceHeight = Math.floor(height * 0.7)
          const startX = Math.floor((width - faceWidth) / 2)
          const startY = Math.floor((height - faceHeight) / 3)

          return {
            bbox: [startX, startY, startX + faceWidth, startY + faceHeight] as [number, number, number, number],
            confidence: 0.8,
            reason: 'center-weighted'
          }
        },

        // Strategy 2: Upper-third detection (common for portraits)
        () => {
          const faceWidth = Math.floor(width * 0.5)
          const faceHeight = Math.floor(height * 0.6)
          const startX = Math.floor((width - faceWidth) / 2)
          const startY = Math.floor(height * 0.1) // Start from 10% from top

          return {
            bbox: [startX, startY, startX + faceWidth, startY + faceHeight] as [number, number, number, number],
            confidence: 0.7,
            reason: 'upper-third'
          }
        },

        // Strategy 3: Variance-based detection (find most textured region)
        () => {
          let maxVariance = 0
          let bestRegion = {
            bbox: [0, 0, width, height] as [number, number, number, number],
            confidence: 0.5,
            reason: 'variance-based'
          }

          const blockSize = Math.min(64, Math.floor(Math.min(width, height) / 8))

          for (let y = 0; y < height - blockSize; y += blockSize / 2) {
            for (let x = 0; x < width - blockSize; x += blockSize / 2) {
              const variance = this.calculateRegionVariance(data, x, y, blockSize, width, height)

              if (variance > maxVariance) {
                maxVariance = variance
                const padding = blockSize
                bestRegion = {
                  bbox: [
                    Math.max(0, x - padding),
                    Math.max(0, y - padding),
                    Math.min(width, x + blockSize + padding),
                    Math.min(height, y + blockSize + padding)
                  ] as [number, number, number, number],
                  confidence: Math.min(0.9, 0.5 + variance / 10000),
                  reason: 'variance-based'
                }
              }
            }
          }

          return bestRegion
        }
      ]

      // Try each strategy and pick the best one
      let bestDetection = null
      let bestScore = 0

      for (let i = 0; i < strategies.length; i++) {
        try {
          const detection = strategies[i]()
          const [x1, y1, x2, y2] = detection.bbox

          // Score based on size and position
          const faceWidth = x2 - x1
          const faceHeight = y2 - y1
          const area = faceWidth * faceHeight
          const centerX = (x1 + x2) / 2
          const centerY = (y1 + y2) / 2

          // Prefer detections that are:
          // 1. Reasonable size (20-80% of image)
          // 2. Centered horizontally
          // 3. In upper 2/3 of image
          const sizeScore = area / (width * height) // 0-1
          const centerScore = 1 - Math.abs(centerX - width / 2) / (width / 2) // 0-1
          const positionScore = centerY < (height * 2) / 3 ? 1 : 0.5 // 0.5-1

          const totalScore = (sizeScore + centerScore + positionScore + detection.confidence) / 4

          console.log(
            `🎯 Strategy ${i} (${detection.reason}): score=${totalScore.toFixed(3)}, bbox=[${detection.bbox.map((v) => v.toFixed(0)).join(', ')}]`
          )

          if (totalScore > bestScore && sizeScore > 0.1 && sizeScore < 0.8) {
            bestScore = totalScore
            bestDetection = detection
          }
        } catch (error) {
          console.log(`❌ Strategy ${i} failed:`, error)
        }
      }

      if (!bestDetection) {
        console.log('❌ All fallback strategies failed')
        return []
      }

      // Generate landmarks for the best detection
      const [x1, y1, x2, y2] = bestDetection.bbox
      const faceWidth = x2 - x1
      const faceHeight = y2 - y1
      const centerX = x1 + faceWidth / 2
      const centerY = y1 + faceHeight / 2

      // Generate approximate landmarks (5 points)
      const eyeY = y1 + faceHeight * 0.4
      const leftEyeX = x1 + faceWidth * 0.3
      const rightEyeX = x1 + faceWidth * 0.7
      const noseX = centerX
      const noseY = y1 + faceHeight * 0.55
      const mouthY = y1 + faceHeight * 0.75
      const leftMouthX = x1 + faceWidth * 0.4
      const rightMouthX = x1 + faceWidth * 0.6

      const landmarks = [
        leftEyeX,
        eyeY, // left eye
        rightEyeX,
        eyeY, // right eye
        noseX,
        noseY, // nose
        leftMouthX,
        mouthY, // left mouth
        rightMouthX,
        mouthY // right mouth
      ]

      console.log(
        `✅ Fallback detection (${bestDetection.reason}): bbox=[${bestDetection.bbox.map((v) => v.toFixed(1)).join(', ')}], confidence=${bestDetection.confidence.toFixed(3)}`
      )

      return [
        {
          bbox: bestDetection.bbox,
          landmarks,
          confidence: bestDetection.confidence
        }
      ]
    } catch (error) {
      console.error('Enhanced fallback face detection failed:', error)
      return []
    }
  }

  // Helper method for variance calculation
  private calculateRegionVariance(
    data: Buffer,
    startX: number,
    startY: number,
    blockSize: number,
    width: number,
    height: number
  ): number {
    let sum = 0
    let sumSquares = 0
    let count = 0

    for (let y = startY; y < Math.min(startY + blockSize, height); y++) {
      for (let x = startX; x < Math.min(startX + blockSize, width); x++) {
        for (let c = 0; c < 3; c++) {
          // RGB channels
          const idx = (y * width + x) * 3 + c
          if (idx < data.length) {
            const pixel = data[idx]
            sum += pixel
            sumSquares += pixel * pixel
            count++
          }
        }
      }
    }

    if (count === 0) return 0
    const mean = sum / count
    return sumSquares / count - mean * mean
  }

  private parseSCRFDOutputs(
    results: { [name: string]: ort.Tensor },
    originalWidth: number,
    originalHeight: number
  ): FaceDetection[] {
    const detections: FaceDetection[] = []

    try {
      const outputNames = Object.keys(results).sort() // Sort để consistent order
      console.log(`🔍 SCRFD outputs: ${outputNames.join(', ')}`)

      // Log all outputs để debug
      for (const outputName of outputNames) {
        const output = results[outputName]?.data as Float32Array
        if (output) {
          console.log(
            `📊 ${outputName}: length=${output.length}, sample=[${Array.from(output.slice(0, 5))
              .map((v) => v.toFixed(3))
              .join(', ')}...]`
          )
        }
      }

      // 🔥 SCRFD Multi-Scale Parsing Strategy
      // SCRFD outputs multiple detection scales, we need to parse all of them

      const scaleX = originalWidth / 640
      const scaleY = originalHeight / 640

      // Group outputs by scale (every 3 outputs = 1 scale: scores, bboxes, landmarks)
      for (let scaleIdx = 0; scaleIdx < outputNames.length; scaleIdx += 3) {
        if (scaleIdx + 2 >= outputNames.length) break

        const scoresName = outputNames[scaleIdx]
        const bboxesName = outputNames[scaleIdx + 1]
        const landmarksName = outputNames[scaleIdx + 2]

        const scoresOutput = results[scoresName]?.data as Float32Array
        const bboxesOutput = results[bboxesName]?.data as Float32Array
        const landmarksOutput = results[landmarksName]?.data as Float32Array

        if (!scoresOutput || !bboxesOutput || !landmarksOutput) {
          console.log(`⚠️ Skipping incomplete scale: ${scoresName}, ${bboxesName}, ${landmarksName}`)
          continue
        }

        console.log(
          `🔄 Processing scale: scores=${scoresOutput.length}, bboxes=${bboxesOutput.length}, landmarks=${landmarksOutput.length}`
        )

        // Calculate number of detections for this scale
        const numDetections = Math.min(
          scoresOutput.length,
          Math.floor(bboxesOutput.length / 4),
          Math.floor(landmarksOutput.length / 10)
        )

        console.log(`📊 Scale ${scaleIdx / 3}: ${numDetections} potential detections`)

        for (let i = 0; i < numDetections; i++) {
          const confidence = scoresOutput[i]

          if (confidence > this.FACE_CONFIDENCE_THRESHOLD) {
            // 🔥 FIX: SCRFD outputs normalized coordinates [0,1], need to scale to actual pixels
            let x1 = bboxesOutput[i * 4]
            let y1 = bboxesOutput[i * 4 + 1]
            let x2 = bboxesOutput[i * 4 + 2]
            let y2 = bboxesOutput[i * 4 + 3]

            // Check if coordinates are normalized (0-1 range) vs pixel coordinates
            if (x1 <= 1.0 && y1 <= 1.0 && x2 <= 1.0 && y2 <= 1.0) {
              // Normalized coordinates - scale to image size
              x1 = x1 * originalWidth
              y1 = y1 * originalHeight
              x2 = x2 * originalWidth
              y2 = y2 * originalHeight
              console.log(
                `🔧 Scaled normalized coords: [${x1.toFixed(1)}, ${y1.toFixed(1)}, ${x2.toFixed(1)}, ${y2.toFixed(1)}]`
              )
            } else {
              // Already pixel coordinates - apply scale factor from resize
              x1 = x1 * scaleX
              y1 = y1 * scaleY
              x2 = x2 * scaleX
              y2 = y2 * scaleY
              console.log(
                `🔧 Scaled pixel coords: [${x1.toFixed(1)}, ${y1.toFixed(1)}, ${x2.toFixed(1)}, ${y2.toFixed(1)}]`
              )
            }

            // Validate bbox with minimum size requirement
            const width = x2 - x1
            const height = y2 - y1
            const minSize = Math.min(originalWidth, originalHeight) * 0.05 // At least 5% of image

            if (
              x1 >= 0 &&
              y1 >= 0 &&
              x2 > x1 &&
              y2 > y1 &&
              x2 <= originalWidth &&
              y2 <= originalHeight &&
              width >= minSize &&
              height >= minSize
            ) {
              const bbox: [number, number, number, number] = [x1, y1, x2, y2]

              // Extract landmarks with same scaling logic
              const landmarks = []
              for (let j = 0; j < 10; j += 2) {
                let lx = landmarksOutput[i * 10 + j]
                let ly = landmarksOutput[i * 10 + j + 1]

                if (lx <= 1.0 && ly <= 1.0) {
                  // Normalized landmarks
                  lx = lx * originalWidth
                  ly = ly * originalHeight
                } else {
                  // Pixel landmarks
                  lx = lx * scaleX
                  ly = ly * scaleY
                }

                landmarks.push(lx, ly)
              }

              detections.push({
                bbox,
                landmarks,
                confidence
              })

              console.log(
                `✅ Valid detection: conf=${confidence.toFixed(3)}, bbox=[${bbox.map((v) => v.toFixed(1)).join(', ')}], size=${width.toFixed(1)}x${height.toFixed(1)}`
              )
            } else {
              console.log(
                `❌ Invalid bbox: [${x1.toFixed(1)}, ${y1.toFixed(1)}, ${x2.toFixed(1)}, ${y2.toFixed(1)}], size=${width.toFixed(1)}x${height.toFixed(1)}`
              )
            }
          }
        }
      }

      // 🔥 ALTERNATIVE PARSING: If the above doesn't work, try different approach
      if (detections.length === 0) {
        console.log('🔄 Trying alternative SCRFD parsing...')

        // Sometimes SCRFD outputs are in different order, try all combinations
        for (let i = 0; i < outputNames.length - 2; i++) {
          for (let j = i + 1; j < outputNames.length - 1; j++) {
            for (let k = j + 1; k < outputNames.length; k++) {
              const alt_detections = this.tryParseCombination(
                results[outputNames[i]]?.data as Float32Array,
                results[outputNames[j]]?.data as Float32Array,
                results[outputNames[k]]?.data as Float32Array,
                scaleX,
                scaleY,
                originalWidth,
                originalHeight
              )

              if (alt_detections.length > 0) {
                console.log(`✅ Alternative parsing worked: ${alt_detections.length} faces found`)
                return alt_detections
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing SCRFD outputs:', error)
    }

    return detections
  }

  // 🔥 Helper method to try different output combinations
  private tryParseCombination(
    output1: Float32Array,
    output2: Float32Array,
    output3: Float32Array,
    scaleX: number,
    scaleY: number,
    originalWidth: number,
    originalHeight: number
  ): FaceDetection[] {
    const detections: FaceDetection[] = []

    if (!output1 || !output2 || !output3) return detections

    // Try different interpretations
    const combinations = [
      { scores: output1, bboxes: output2, landmarks: output3 }, // scores, bboxes, landmarks
      { scores: output1, bboxes: output3, landmarks: output2 }, // scores, landmarks, bboxes
      { scores: output2, bboxes: output1, landmarks: output3 }, // bboxes, scores, landmarks
      { scores: output2, bboxes: output3, landmarks: output1 }, // bboxes, landmarks, scores
      { scores: output3, bboxes: output1, landmarks: output2 }, // landmarks, scores, bboxes
      { scores: output3, bboxes: output2, landmarks: output1 } // landmarks, bboxes, scores
    ]

    for (const combo of combinations) {
      const { scores, bboxes, landmarks } = combo

      const numDetections = Math.min(scores.length, Math.floor(bboxes.length / 4), Math.floor(landmarks.length / 10))

      let validDetections = 0

      for (let i = 0; i < Math.min(numDetections, 50); i++) {
        const confidence = scores[i]

        if (confidence > this.FACE_CONFIDENCE_THRESHOLD && confidence < 1.0) {
          const x1 = bboxes[i * 4] * scaleX
          const y1 = bboxes[i * 4 + 1] * scaleY
          const x2 = bboxes[i * 4 + 2] * scaleX
          const y2 = bboxes[i * 4 + 3] * scaleY

          // Validate bbox
          if (
            x1 >= 0 &&
            y1 >= 0 &&
            x2 > x1 &&
            y2 > y1 &&
            x2 <= originalWidth &&
            y2 <= originalHeight &&
            x2 - x1 > 10 &&
            y2 - y1 > 10
          ) {
            // Minimum face size

            const bbox: [number, number, number, number] = [x1, y1, x2, y2]

            const faceLandmarks = []
            for (let j = 0; j < 10; j += 2) {
              const x = landmarks[i * 10 + j] * scaleX
              const y = landmarks[i * 10 + j + 1] * scaleY
              faceLandmarks.push(x, y)
            }

            detections.push({
              bbox,
              landmarks: faceLandmarks,
              confidence
            })

            validDetections++
          }
        }
      }

      if (validDetections > 0) {
        console.log(`🎯 Found working combination: ${validDetections} valid detections`)
        return detections
      }
    }

    return detections
  }

  // 🔥 STEP 2a: Crop and Align Face using Landmarks
  private async cropAndAlignFace(imageBuffer: Buffer, detection: FaceDetection): Promise<Buffer> {
    try {
      const { bbox, landmarks } = detection

      // Get original image dimensions
      const imageInfo = await sharp(imageBuffer).metadata()
      const originalWidth = imageInfo.width || 640
      const originalHeight = imageInfo.height || 640

      // Extract face region with padding
      const [x1, y1, x2, y2] = bbox
      const width = x2 - x1
      const height = y2 - y1

      // Calculate padding (20% of face size, minimum 10px)
      const padding = Math.max(10, Math.max(width, height) * 0.2)

      // Calculate crop region with bounds checking
      let cropX = Math.max(0, x1 - padding)
      let cropY = Math.max(0, y1 - padding)
      let cropWidth = Math.min(originalWidth - cropX, width + padding * 2)
      let cropHeight = Math.min(originalHeight - cropY, height + padding * 2)

      // Ensure minimum crop size
      const minCropSize = 50
      if (cropWidth < minCropSize || cropHeight < minCropSize) {
        console.log(`⚠️ Face too small, using fallback crop`)

        // Fallback: use center region
        const centerX = originalWidth / 2
        const centerY = originalHeight / 2
        const fallbackSize = Math.min(originalWidth, originalHeight) * 0.8

        cropX = Math.max(0, centerX - fallbackSize / 2)
        cropY = Math.max(0, centerY - fallbackSize / 2)
        cropWidth = Math.min(originalWidth - cropX, fallbackSize)
        cropHeight = Math.min(originalHeight - cropY, fallbackSize)
      }

      // Final validation
      cropX = Math.floor(Math.max(0, cropX))
      cropY = Math.floor(Math.max(0, cropY))
      cropWidth = Math.floor(Math.max(minCropSize, Math.min(cropWidth, originalWidth - cropX)))
      cropHeight = Math.floor(Math.max(minCropSize, Math.min(cropHeight, originalHeight - cropY)))

      console.log(
        `✂️ Cropping face: bbox=[${bbox.map((v) => v.toFixed(1)).join(', ')}], crop=[${cropX}, ${cropY}, ${cropWidth}, ${cropHeight}], image=${originalWidth}x${originalHeight}`
      )

      // Validate final crop parameters
      if (
        cropX + cropWidth > originalWidth ||
        cropY + cropHeight > originalHeight ||
        cropWidth <= 0 ||
        cropHeight <= 0
      ) {
        console.log(`❌ Invalid crop parameters, using simple resize fallback`)
        return await sharp(imageBuffer).resize(112, 112, { fit: 'cover' }).toBuffer()
      }

      // Perform the crop and resize
      const alignedFace = await sharp(imageBuffer)
        .extract({
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight
        })
        .resize(112, 112, { fit: 'cover' }) // Standard size for both GenderAge and W600K MBF
        .toBuffer()

      console.log(`✅ Face aligned to 112x112`)
      return alignedFace
    } catch (error) {
      console.error('Face cropping/alignment failed:', error)
      console.log(`🔄 Using simple resize fallback...`)

      // Ultimate fallback: just resize the whole image
      try {
        return await sharp(imageBuffer).resize(112, 112, { fit: 'cover' }).toBuffer()
      } catch (fallbackError) {
        console.error('Even resize fallback failed:', fallbackError)
        throw new Error('Complete face processing failure')
      }
    }
  }

  // 🔥 IMPROVED: Choose based on confidence when methods disagree
  private async estimateGenderAge(alignedFace: Buffer): Promise<{
    age: number
    gender: 'nam' | 'nữ'
    confidence: number
  }> {
    console.log('🎨 Using Computer Vision as PRIMARY method for gender/age estimation...')
    const cvResult = await this.estimateWithComputerVision(alignedFace)

    // If CV gives high confidence, use it directly
    if (cvResult.confidence >= 0.7) {
      console.log(`✅ Computer Vision confidence high (${cvResult.confidence.toFixed(3)}), using CV result`)
      return cvResult
    }

    // If CV confidence is low/medium, try GenderAge model if available
    if (this.genderAgeSession) {
      try {
        console.log(`🔀 CV confidence (${cvResult.confidence.toFixed(3)}), trying GenderAge model...`)
        const modelResult = await this.estimateWithGenderAgeModel(alignedFace)

        // 🔥 NEW LOGIC: Choose based on confidence, not bias toward CV
        if (cvResult.gender === modelResult.gender) {
          // Both methods agree - boost confidence
          const combinedAge = Math.round(
            (cvResult.age * cvResult.confidence + modelResult.age * modelResult.confidence) /
              (cvResult.confidence + modelResult.confidence)
          )
          const finalConfidence = Math.min(0.95, (cvResult.confidence + modelResult.confidence) / 2 + 0.2)

          console.log(
            `🤝 CV and Model AGREE on gender: ${cvResult.gender}, boosted confidence: ${finalConfidence.toFixed(3)}`
          )
          return { age: combinedAge, gender: cvResult.gender, confidence: finalConfidence }
        } else {
          // Methods disagree - choose the one with HIGHER confidence
          console.log(
            `⚡ CV and Model DISAGREE: CV=${cvResult.gender}(${cvResult.confidence.toFixed(3)}) vs Model=${modelResult.gender}(${modelResult.confidence.toFixed(3)})`
          )

          if (modelResult.confidence > cvResult.confidence + 0.1) {
            // Model significantly more confident
            console.log(`🎯 Model more confident, using Model result: ${modelResult.gender}`)

            // Use model's gender, but average the age
            const combinedAge = Math.round((cvResult.age + modelResult.age) / 2)
            // Penalty for disagreement but reward higher confidence
            const finalConfidence = Math.max(0.4, modelResult.confidence - 0.1)

            return { age: combinedAge, gender: modelResult.gender, confidence: finalConfidence }
          } else if (cvResult.confidence > modelResult.confidence + 0.1) {
            // CV significantly more confident
            console.log(`🎯 CV more confident, using CV result: ${cvResult.gender}`)

            const combinedAge = Math.round((cvResult.age + modelResult.age) / 2)
            const finalConfidence = Math.max(0.4, cvResult.confidence - 0.1)

            return { age: combinedAge, gender: cvResult.gender, confidence: finalConfidence }
          } else {
            // Similar confidence - use weighted average approach or fallback rules
            console.log(`🤔 Similar confidence, applying fallback rules...`)

            // Fallback rule 1: If model confidence > 0.6, trust it more for gender
            if (modelResult.confidence >= 0.6) {
              console.log(`📊 Model confidence >= 0.6, preferring model result`)
              const combinedAge = Math.round((cvResult.age + modelResult.age) / 2)
              return {
                age: combinedAge,
                gender: modelResult.gender,
                confidence: Math.max(0.5, modelResult.confidence - 0.05)
              }
            }

            // Fallback rule 2: Otherwise prefer CV
            console.log(`📊 Using CV as fallback`)
            const combinedAge = Math.round((cvResult.age + modelResult.age) / 2)
            return { age: combinedAge, gender: cvResult.gender, confidence: Math.max(0.4, cvResult.confidence) }
          }
        }
      } catch (error) {
        console.warn('GenderAge model verification failed:', error)
      }
    }

    // Fallback: use CV result only
    console.log(`💡 Using Computer Vision result with confidence: ${cvResult.confidence.toFixed(3)}`)
    return { ...cvResult, confidence: Math.max(0.4, cvResult.confidence) }
  }

  private async estimateWithGenderAgeModel(alignedFace: Buffer): Promise<{
    age: number
    gender: 'nam' | 'nữ'
    confidence: number
  }> {
    const { data } = await sharp(alignedFace)
      .resize(96, 96)
      .toColorspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Preprocess for GenderAge model
    const inputData = new Float32Array(3 * 96 * 96)
    for (let h = 0; h < 96; h++) {
      for (let w = 0; w < 96; w++) {
        for (let c = 0; c < 3; c++) {
          const srcIdx = (h * 96 + w) * 3 + c
          const dstIdx = c * 96 * 96 + h * 96 + w
          inputData[dstIdx] = (data[srcIdx] / 255.0 - 0.5) / 0.5 // Normalize to [-1, 1]
        }
      }
    }

    const inputName = this.genderAgeSession!.inputNames[0]
    const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 96, 96])
    const feeds: { [name: string]: ort.Tensor } = {}
    feeds[inputName] = inputTensor

    const results = await this.genderAgeSession!.run(feeds)
    const output = results[this.genderAgeSession!.outputNames[0]]?.data as Float32Array

    console.log(
      `🔍 GenderAge output: [${Array.from(output.slice(0, 5))
        .map((v) => v.toFixed(3))
        .join(', ')}...] (length: ${output.length})`
    )

    // Parse based on output format - ALWAYS USE STRATEGY A
    let age = 20
    let gender: 'nam' | 'nữ' = 'nam' // Default to male
    let confidence = 0.5

    if (output.length >= 3) {
      const val1 = output[0] // Age estimation value
      const val2 = output[1] // Gender value 1
      const val3 = output[2] // Gender value 2

      console.log(`🔍 Raw values: val1=${val1.toFixed(3)}, val2=${val2.toFixed(3)}, val3=${val3.toFixed(3)}`)

      // Age estimation (val1 seems to be normalized age)
      if (Math.abs(val1) < 2.0) {
        age = Math.round(Math.max(15, Math.min(60, val1 * 50 + 25))) // Scale to 15-60 range
      }

      // 🔥 STRATEGY A (PRIORITY): Threshold-based approach
      const genderDiff = val3 - val2 // Difference between val3 and val2
      const absDiff = Math.abs(val2) + Math.abs(val3) // Total magnitude

      console.log(`🔍 Strategy A analysis: diff=${genderDiff.toFixed(3)}, absDiff=${absDiff.toFixed(3)}`)

      // Threshold-based gender detection
      if (genderDiff < 0.6) {
        gender = 'nam'
        confidence = Math.min(0.9, (0.6 - genderDiff) / 0.6 + 0.4)
      } else {
        gender = 'nữ'
        confidence = Math.min(0.9, (genderDiff - 0.6) / 0.4 + 0.4)
      }

      console.log(`🎯 Strategy A result (FINAL): gender=${gender}, confidence=${confidence.toFixed(3)}`)

      // 🔥 BOOST CONFIDENCE: Since Strategy A is most accurate according to your testing
      // Increase confidence by 10-15% to make it more competitive
      confidence = Math.min(0.95, confidence + 0.12)

      console.log(`✅ Strategy A boosted confidence: ${confidence.toFixed(3)}`)

      // 🔥 FALLBACK: Only if Strategy A gives extremely low confidence (< 0.3)
      if (confidence < 0.3) {
        console.log(`⚠️ Strategy A confidence too low (${confidence.toFixed(3)}), using fallback...`)

        // Fallback: use simple magnitude comparison
        const maleStrength = Math.abs(val2)
        const femaleStrength = Math.abs(val3)

        if (maleStrength > femaleStrength) {
          gender = 'nam'
          confidence = Math.max(0.4, maleStrength / (maleStrength + femaleStrength))
        } else {
          gender = 'nữ'
          confidence = Math.max(0.4, femaleStrength / (maleStrength + femaleStrength))
        }

        console.log(`🔄 Fallback result: gender=${gender}, confidence=${confidence.toFixed(3)}`)
      }
    }

    console.log(
      `👫 GenderAge FINAL result (Strategy A Priority): age=${age}, gender=${gender}, confidence=${confidence.toFixed(3)}`
    )
    return { age, gender, confidence: Math.max(0.2, confidence) }
  }

  private async estimateWithComputerVision(alignedFace: Buffer): Promise<{
    age: number
    gender: 'nam' | 'nữ'
    confidence: number
  }> {
    console.log('🎨 Using Computer Vision gender/age estimation...')

    const { data: rgbData, info } = await sharp(alignedFace)
      .resize(128, 128)
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { data: grayData } = await sharp(alignedFace)
      .resize(128, 128)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Gender detection based on facial features
    const genderResult = await this.detectGenderFromFeatures(rgbData, grayData, info.width, info.height)

    // Age estimation based on skin and facial analysis
    const ageResult = await this.estimateAgeFromFeatures(rgbData, grayData, info.width, info.height)

    const combinedConfidence = (genderResult.confidence + ageResult.confidence) / 2

    return {
      age: ageResult.age,
      gender: genderResult.gender,
      confidence: Math.max(0.4, combinedConfidence)
    }
  }

  // Computer Vision helper methods (simplified versions)
  private async detectGenderFromFeatures(
    rgbData: Buffer,
    grayData: Buffer,
    width: number,
    height: number
  ): Promise<{ gender: 'nam' | 'nữ'; confidence: number }> {
    let maleScore = 0
    let femaleScore = 0

    // Simplified feature analysis with better male detection
    // 1. Jawline sharpness (stronger indicator for males)
    const jawSharpness = this.calculateJawSharpness(grayData, width, height)
    console.log(`🔍 CV: Jawline sharpness: ${jawSharpness.toFixed(3)}`)

    if (jawSharpness > 0.4) {
      maleScore += 0.4 // Strong indicator for male
    } else if (jawSharpness < 0.25) {
      femaleScore += 0.3 // Soft jawline for female
    }

    // 2. Face ratio (males typically have wider faces)
    const faceRatio = width / height
    console.log(`🔍 CV: Face ratio: ${faceRatio.toFixed(3)}`)

    if (faceRatio > 0.88) {
      maleScore += 0.25 // Wider face = male
    } else if (faceRatio < 0.8) {
      femaleScore += 0.2 // Narrower face = female
    }

    // 3. Skin smoothness (stronger weight for gender detection)
    const skinSmoothness = this.calculateSkinSmoothness(rgbData, width, height)
    console.log(`🔍 CV: Skin smoothness: ${skinSmoothness.toFixed(3)}`)

    if (skinSmoothness > 0.7) {
      femaleScore += 0.3 // Very smooth = female (makeup, skincare)
    } else if (skinSmoothness < 0.5) {
      maleScore += 0.25 // Rougher skin = male
    }

    // 4. Additional male indicators
    const edgeSharpness = this.calculateEdgeSharpness(grayData, width, height)
    console.log(`🔍 CV: Edge sharpness: ${edgeSharpness.toFixed(3)}`)

    if (edgeSharpness > 0.6) {
      maleScore += 0.2 // Sharp features = male
    }

    // 5. Texture analysis
    const textureVariance = this.calculateTextureVariance(grayData, width, height)
    console.log(`🔍 CV: Texture variance: ${textureVariance.toFixed(3)}`)

    if (textureVariance > 0.5) {
      maleScore += 0.15 // More texture variation = male
    } else {
      femaleScore += 0.15 // Smoother texture = female
    }

    console.log(`🎯 CV Scores: Male=${maleScore.toFixed(3)}, Female=${femaleScore.toFixed(3)}`)

    const gender = maleScore > femaleScore ? 'nam' : 'nữ'
    const confidence = Math.abs(maleScore - femaleScore) / Math.max(maleScore, femaleScore, 0.1)

    console.log(`🎯 CV Final: gender=${gender}, confidence=${confidence.toFixed(3)}`)

    return { gender, confidence: Math.min(0.9, Math.max(0.4, confidence)) }
  }

  // Additional helper methods for better male detection
  private calculateEdgeSharpness(grayData: Buffer, width: number, height: number): number {
    let sharpness = 0

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const current = grayData[idx]
        const right = grayData[idx + 1]
        const down = grayData[(y + 1) * width + x]

        const gradientX = Math.abs(current - right)
        const gradientY = Math.abs(current - down)
        const gradient = Math.sqrt(gradientX * gradientX + gradientY * gradientY)

        sharpness += gradient
      }
    }

    return Math.min(1, sharpness / ((width - 2) * (height - 2) * 255))
  }

  private calculateTextureVariance(grayData: Buffer, width: number, height: number): number {
    let variance = 0
    const samples = Math.floor(width * height * 0.3)

    for (let i = 0; i < samples; i++) {
      const y = Math.floor(height * 0.3) + Math.floor(i / (width * 0.4))
      const x = Math.floor(width * 0.3) + (i % Math.floor(width * 0.4))
      const idx = y * width + x

      if (idx < grayData.length && idx + width < grayData.length) {
        const current = grayData[idx]
        const below = grayData[idx + width]
        variance += Math.abs(current - below) / 255
      }
    }

    return variance / samples
  }

  private async estimateAgeFromFeatures(
    rgbData: Buffer,
    grayData: Buffer,
    width: number,
    height: number
  ): Promise<{ age: number; confidence: number }> {
    let ageScore = 20

    // Skin texture complexity
    const skinComplexity = this.calculateSkinComplexity(rgbData, width, height)
    if (skinComplexity < 0.3) ageScore = 18
    else if (skinComplexity < 0.5) ageScore = 25
    else if (skinComplexity < 0.7) ageScore = 35
    else ageScore = 45

    // Eye area analysis
    const eyeAreaAging = this.calculateEyeAreaAging(grayData, width, height)
    if (eyeAreaAging > 0.5) ageScore += 8

    const finalAge = Math.max(15, Math.min(60, Math.round(ageScore)))

    return { age: finalAge, confidence: 0.6 }
  }

  // 🔥 STEP 2c: Face Recognition Embedding with W600K MBF
  private async extractFaceEmbedding(alignedFace: Buffer): Promise<number[]> {
    if (!this.embeddingSession) {
      throw new Error('W600K MBF model not loaded')
    }

    try {
      // Preprocess for W600K MBF (112x112)
      const { data } = await sharp(alignedFace)
        .resize(112, 112)
        .toColorspace('srgb')
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      // Convert to CHW format with [-1, 1] normalization
      const inputData = new Float32Array(3 * 112 * 112)
      for (let h = 0; h < 112; h++) {
        for (let w = 0; w < 112; w++) {
          for (let c = 0; c < 3; c++) {
            const srcIdx = (h * 112 + w) * 3 + c
            const dstIdx = c * 112 * 112 + h * 112 + w
            inputData[dstIdx] = (data[srcIdx] / 255.0 - 0.5) / 0.5
          }
        }
      }

      // Run W600K MBF inference
      const inputName = this.embeddingSession.inputNames[0]
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 112, 112])
      const feeds: { [name: string]: ort.Tensor } = {}
      feeds[inputName] = inputTensor

      const results = await this.embeddingSession.run(feeds)
      const outputName = this.embeddingSession.outputNames[0]
      const outputTensor = results[outputName]
      const embedding = Array.from(outputTensor.data as Float32Array)

      console.log(`✅ W600K MBF extracted ${embedding.length}D embedding`)
      return this.l2Normalize(embedding)
    } catch (error) {
      console.error('W600K MBF embedding extraction failed:', error)
      throw error
    }
  }

  // 🔥 STEP 2d: Face Quality Assessment
  private async assessFaceQuality(alignedFace: Buffer): Promise<number> {
    try {
      const stats = await sharp(alignedFace).stats()
      const { data } = await sharp(alignedFace).greyscale().raw().toBuffer({ resolveWithObject: true })

      // Calculate quality metrics
      const brightness = stats.channels[0].mean / 255
      const contrast = stats.channels[0].stdev / 255
      const sharpness = this.calculateSharpness(data, 112, 112)

      const quality = brightness * 0.3 + contrast * 0.4 + sharpness * 0.3
      return Math.min(1, Math.max(0, quality))
    } catch (error) {
      console.error('Quality assessment failed:', error)
      return 0.5
    }
  }

  // 🎯 PUBLIC METHODS

  async storeFaceEmbedding(userId: string, imageBuffer: Buffer): Promise<boolean> {
    try {
      const analyses = await this.analyzeImageComplete(imageBuffer)

      if (analyses.length === 0) {
        throw new Error('No faces detected in image')
      }

      // Use the first (largest/best quality) face
      const bestFace = analyses.reduce((best, current) => (current.quality > best.quality ? current : best))

      const { detection, age, gender, embedding, alignedFace, quality } = bestFace

      // Generate state description
      const state_moment = this.generateStateDescription(age, gender, quality)

      // Get user info for age description
      const user = await databaseService.users.findOne({ _id: new ObjectId(userId) })
      const userAge = this.convertClassToAge(user?.class as string)
      const ageGroup = this.getAgeGroupFromClass(user?.class as string)
      const userAgeDescription = `${userAge} tuổi, ${ageGroup}`

      // 🔥 FIXED: Upload reference image to S3 properly
      const referenceImageUrl = await this.uploadProfileImageToS3(userId, imageBuffer)
      await this.updateUserAvatar(userId, referenceImageUrl)

      // Store face embedding with all detection info
      const faceEmbeddingDoc: FaceEmbedding = {
        user_id: new ObjectId(userId),
        embedding,
        face_features: {
          landmarks: detection.landmarks,
          quality_score: quality,
          brightness: 0.5, // Could extract from stats
          contrast: 0.5, // Could extract from stats
          detection_confidence: detection.confidence
        },
        state_moment,
        user_age: userAgeDescription,
        reference_image_url: referenceImageUrl,
        created_at: new Date(),
        updated_at: new Date()
      }

      await databaseService.db
        .collection('face_embeddings')
        .replaceOne({ user_id: new ObjectId(userId) }, faceEmbeddingDoc, { upsert: true })

      console.log(`✅ Complete face analysis stored for user ${userId}`)
      console.log(`📊 Detection confidence: ${detection.confidence.toFixed(3)}, Quality: ${quality.toFixed(3)}`)
      console.log(`📝 State: ${state_moment}`)
      console.log(`🔗 Reference: ${referenceImageUrl}`)

      return true
    } catch (error) {
      console.error('Error storing face embedding:', error)
      return false
    }
  }

  // 🔥 UPDATED: AI-powered face verification using Gemini Vision
  async verifyFace(
    userId: string,
    imageBuffer: Buffer
  ): Promise<{
    isMatch: boolean
    similarity: number
    confidence: 'high' | 'medium' | 'low'
    quality_score: number
    detection_info?: any
    ai_analysis?: string
  }> {
    try {
      console.log(`🔍 Starting AI-powered face verification for user ${userId}`)

      // Get stored embedding document
      const storedEmbeddingDoc = await databaseService.db
        .collection('face_embeddings')
        .findOne({ user_id: new ObjectId(userId) })

      if (!storedEmbeddingDoc?.reference_image_url) {
        throw new Error('No stored face reference found')
      }

      console.log(`📥 Downloading reference image from: ${storedEmbeddingDoc.reference_image_url}`)

      // Download reference image from S3
      const referenceImageBuffer = await this.downloadImageFromS3(storedEmbeddingDoc.reference_image_url)

      // Analyze new image to get quality score
      const analyses = await this.analyzeImageComplete(imageBuffer)

      if (analyses.length === 0) {
        return {
          isMatch: false,
          similarity: 0,
          confidence: 'low',
          quality_score: 0,
          ai_analysis: 'No faces detected in provided image'
        }
      }

      // Use best quality face
      const bestFace = analyses.reduce((best, current) => (current.quality > best.quality ? current : best))

      // 🔥 Use Gemini AI to compare the two images
      const aiComparison = await this.compareImagesWithAI(referenceImageBuffer, imageBuffer)

      // Parse AI result
      const { isMatch, similarity, confidence, analysis } = this.parseAIComparison(aiComparison, bestFace.quality)

      console.log(
        `🎯 AI Verification result: match=${isMatch}, similarity=${similarity.toFixed(3)}, confidence=${confidence}`
      )
      console.log(`🤖 AI Analysis: ${analysis}`)

      return {
        isMatch,
        similarity,
        confidence,
        quality_score: bestFace.quality,
        detection_info: {
          faces_detected: analyses.length,
          best_face_confidence: bestFace.detection.confidence,
          landmarks_count: bestFace.detection.landmarks.length / 2
        },
        ai_analysis: analysis
      }
    } catch (error: any) {
      console.error('AI face verification failed:', error)
      return {
        isMatch: false,
        similarity: 0,
        confidence: 'low',
        quality_score: 0,
        ai_analysis: `Verification failed: ${error.message}`
      }
    }
  }

  private async downloadImageFromS3(imageUrl: string): Promise<Buffer> {
    console.log(`📥 Starting download: ${imageUrl}`)

    // Parse S3 URL properly
    const { bucket, key, region } = this.parseS3URL(imageUrl)
    console.log(`🔍 Parsed S3 URL: bucket=${bucket}, key=${key}, region=${region}`)

    // Method 1: Try direct HTTPS first (fastest)
    try {
      console.log(`🌐 Trying direct HTTPS download...`)
      return await this.downloadImageViaHTTP(imageUrl)
    } catch (httpError: any) {
      console.warn(`⚠️ HTTPS download failed:`, httpError.message)

      // Method 2: Try S3 SDK
      try {
        console.log(`🔄 Trying S3 SDK download...`)
        return await this.downloadViaS3SDK(bucket, key)
      } catch (s3Error: any) {
        console.warn(`⚠️ S3 SDK failed:`, s3Error.message)

        // Method 3: Try signed URL
        try {
          console.log(`🔄 Trying pre-signed URL...`)
          return await this.downloadViaPresignedURL(bucket, key)
        } catch (signedError: any) {
          console.error(`❌ All download methods failed`)
          throw new Error(
            `Could not download image: HTTP=${httpError.message}, S3=${s3Error.message}, Signed=${signedError.message}`
          )
        }
      }
    }
  }

  // 🔧 Parse S3 URL to extract components
  private parseS3URL(imageUrl: string): { bucket: string; key: string; region: string } {
    try {
      // Handle virtual-hosted-style URLs: https://bucket-name.s3.region.amazonaws.com/key
      const url = new URL(imageUrl)
      const hostname = url.hostname

      let bucket: string
      let region: string

      if (hostname.includes('.s3.') && hostname.includes('.amazonaws.com')) {
        // Virtual-hosted-style: bucket-name.s3.region.amazonaws.com
        const parts = hostname.split('.s3.')
        bucket = parts[0]
        region = parts[1].replace('.amazonaws.com', '')
      } else if (hostname.startsWith('s3.') || hostname.startsWith('s3-')) {
        // Path-style: s3.region.amazonaws.com/bucket-name/key
        const pathParts = url.pathname.split('/').filter((p) => p)
        bucket = pathParts[0]
        region = hostname.includes('s3-') ? hostname.replace('s3-', '').replace('.amazonaws.com', '') : 'us-east-1'
      } else {
        throw new Error('Invalid S3 URL format')
      }

      const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname

      console.log(`🔍 URL Parse Result: bucket=${bucket}, region=${region}, key=${key}`)

      return { bucket, key, region }
    } catch (error) {
      console.error('Failed to parse S3 URL:', error)

      // Fallback parsing
      const bucketName = envConfig.Bucket_Name as string
      const urlPattern = `https://${bucketName}.s3.${envConfig.region}.amazonaws.com/`
      const key = imageUrl.replace(urlPattern, '')

      return {
        bucket: bucketName,
        key,
        region: envConfig.region as string
      }
    }
  }

  // Method 1: S3 SDK Download
  private async downloadViaS3SDK(bucket: string, key: string): Promise<Buffer> {
    console.log(`🔧 S3 SDK Download: Bucket=${bucket}, Key=${key}`)

    // Use existing S3 client or create new one
    const s3Client =
      this.s3 ||
      new S3({
        region: envConfig.region,
        credentials: {
          accessKeyId: envConfig.accessKeyId as string,
          secretAccessKey: envConfig.secretAccessKey as string
        },
        forcePathStyle: false, // Use virtual-hosted-style URLs
        useAccelerateEndpoint: false
      })

    const response = await s3Client.getObject({
      Bucket: bucket,
      Key: key
    })

    if (!response.Body) {
      throw new Error('Empty response from S3')
    }

    const chunks: Uint8Array[] = []
    const stream = response.Body as any

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    console.log(`✅ S3 SDK downloaded ${buffer.length} bytes`)
    return buffer
  }

  // Method 2: Direct HTTPS Download
  private async downloadImageViaHTTP(imageUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const https = require('https')

      console.log(`🌐 HTTPS Download: ${imageUrl}`)

      const request = https.get(imageUrl, (response: any) => {
        console.log(`📡 HTTP Response: ${response.statusCode} ${response.statusMessage}`)

        if (response.statusCode === 403) {
          reject(new Error(`HTTP 403: Access denied - check bucket public access settings`))
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
          return
        }

        const chunks: Buffer[] = []
        let totalSize = 0

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
          totalSize += chunk.length
        })

        response.on('end', () => {
          const buffer = Buffer.concat(chunks)
          console.log(`✅ HTTPS downloaded ${buffer.length} bytes`)
          resolve(buffer)
        })

        response.on('error', (error: Error) => {
          reject(error)
        })
      })

      request.on('error', (error: Error) => {
        reject(error)
      })

      request.setTimeout(30000, () => {
        request.destroy()
        reject(new Error('Download timeout after 30 seconds'))
      })
    })
  }

  // Method 3: Pre-signed URL Download
  private async downloadViaPresignedURL(bucket: string, key: string): Promise<Buffer> {
    console.log(`🔐 Generating pre-signed URL for: ${bucket}/${key}`)

    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
    const { GetObjectCommand } = require('@aws-sdk/client-s3')

    const s3Client =
      this.s3 ||
      new S3({
        region: envConfig.region,
        credentials: {
          accessKeyId: envConfig.accessKeyId as string,
          secretAccessKey: envConfig.secretAccessKey as string
        }
      })

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    console.log(`🔗 Pre-signed URL generated: ${signedUrl.substring(0, 100)}...`)

    return await this.downloadImageViaHTTP(signedUrl)
  }

  // 🔥 NEW: Compare two images using Gemini AI
  private async compareImagesWithAI(referenceImage: Buffer, currentImage: Buffer): Promise<string> {
    try {
      console.log('🤖 Using Gemini AI for face comparison...')

      // Convert images to base64
      const referenceBase64 = referenceImage.toString('base64')
      const currentBase64 = currentImage.toString('base64')

      // Create prompt for Gemini
      const prompt = `Bạn là một chuyên gia nhận dạng khuôn mặt. Hãy so sánh hai bức ảnh sau và xác định xem chúng có phải là cùng một người hay không.

NHIỆM VỤ:
1. Phân tích kỹ lưỡng các đặc điểm khuôn mặt trong cả hai ảnh
2. So sánh: hình dáng mặt, mắt, mũi, miệng, tai, tổng thể gương mặt
3. Đưa ra kết luận có phải cùng một người hay không
4. Cho điểm similarity từ 0-100 (0 = hoàn toàn khác người, 100 = chắc chắn cùng người)
5. Đánh giá mức độ tin cậy: HIGH/MEDIUM/LOW

LƯU Ý:
- Bỏ qua sự khác biệt về ánh sáng, góc chụp, chất lượng ảnh
- Tập trung vào các đặc điểm sinh trắc học cơ bản
- Nếu không thấy rõ mặt người trong ảnh nào thì báo LOW confidence

ĐỊNH DẠNG TRẢ LỜI:
RESULT: [SAME/DIFFERENT]
SIMILARITY: [0-100]
CONFIDENCE: [HIGH/MEDIUM/LOW]
ANALYSIS: [Giải thích chi tiết lý do so sánh, ít nhất 2-3 câu về các đặc điểm cụ thể]

Hãy phân tích và trả lời:`

      const result = await this.geminiModel.generateContent([
        {
          text: prompt
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: referenceBase64
          }
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: currentBase64
          }
        }
      ])

      const response = await result.response
      const aiResponse = response.text()

      console.log(`🤖 Gemini AI Response:`)
      console.log(aiResponse)

      return aiResponse
    } catch (error: any) {
      console.error('Gemini AI comparison failed:', error)
      throw new Error(`AI comparison failed: ${error.message}`)
    }
  }

  // 🔥 NEW: Parse AI comparison result
  private parseAIComparison(
    aiResponse: string,
    imageQuality: number
  ): {
    isMatch: boolean
    similarity: number
    confidence: 'high' | 'medium' | 'low'
    analysis: string
  } {
    try {
      // Extract information using regex
      const resultMatch = aiResponse.match(/RESULT:\s*(SAME|DIFFERENT)/i)
      const similarityMatch = aiResponse.match(/SIMILARITY:\s*(\d+)/i)
      const confidenceMatch = aiResponse.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i)
      const analysisMatch = aiResponse.match(/ANALYSIS:\s*(.+)/is)

      const result = resultMatch?.[1]?.toUpperCase() || 'DIFFERENT'
      const similarity = similarityMatch ? parseInt(similarityMatch[1]) / 100 : 0
      const aiConfidence = (confidenceMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low') || 'low'
      const analysis = analysisMatch?.[1]?.trim() || 'No detailed analysis available'

      const isMatch = result === 'SAME'

      // Adjust confidence based on image quality
      let finalConfidence = aiConfidence
      if (imageQuality < 0.4) {
        finalConfidence = 'low'
      } else if (imageQuality < 0.7 && aiConfidence === 'high') {
        finalConfidence = 'medium'
      }

      // Apply similarity threshold
      const adjustedSimilarity = isMatch ? Math.max(similarity, 0.5) : Math.min(similarity, 0.4)

      console.log(
        `📊 Parsed AI result: result=${result}, similarity=${similarity}, confidence=${aiConfidence} -> ${finalConfidence}`
      )

      return {
        isMatch: isMatch && adjustedSimilarity >= 0.6, // Apply threshold
        similarity: adjustedSimilarity,
        confidence: finalConfidence,
        analysis
      }
    } catch (error: any) {
      console.error('Failed to parse AI response:', error)
      return {
        isMatch: false,
        similarity: 0,
        confidence: 'low',
        analysis: `Failed to parse AI response: ${error.message}`
      }
    }
  }

  // Helper utility methods
  private calculateJawSharpness(grayData: Buffer, width: number, height: number): number {
    // Simplified jawline analysis
    let sharpness = 0
    const jawY = Math.floor(height * 0.85)

    for (let x = 10; x < width - 10; x++) {
      const current = grayData[jawY * width + x]
      const next = grayData[jawY * width + (x + 1)]
      sharpness += Math.abs(current - next)
    }

    return Math.min(1, sharpness / ((width - 20) * 255))
  }

  private calculateSkinSmoothness(rgbData: Buffer, width: number, height: number): number {
    let smoothness = 0
    const samples = width * height * 0.3

    for (let i = 0; i < samples; i++) {
      const idx = i * 3
      if (idx + 6 < rgbData.length) {
        const r1 = rgbData[idx],
          g1 = rgbData[idx + 1],
          b1 = rgbData[idx + 2]
        const r2 = rgbData[idx + 3],
          g2 = rgbData[idx + 4],
          b2 = rgbData[idx + 5]

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
        smoothness += 1 - diff / (3 * 255)
      }
    }

    return smoothness / samples
  }

  private calculateSkinComplexity(rgbData: Buffer, width: number, height: number): number {
    let complexity = 0
    const samples = width * height * 0.2

    for (let i = 0; i < samples; i++) {
      const y = Math.floor(height * 0.3) + Math.floor(i / (width * 0.4))
      const x = Math.floor(width * 0.3) + (i % Math.floor(width * 0.4))
      const idx = y * width + x

      if (idx * 3 + 2 < rgbData.length && (y + 1) * width + x < width * height) {
        const r1 = rgbData[idx * 3],
          g1 = rgbData[idx * 3 + 1],
          b1 = rgbData[idx * 3 + 2]
        const nextIdx = (y + 1) * width + x
        const r2 = rgbData[nextIdx * 3],
          g2 = rgbData[nextIdx * 3 + 1],
          b2 = rgbData[nextIdx * 3 + 2]

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
        complexity += diff / (3 * 255)
      }
    }

    return complexity / samples
  }

  private calculateEyeAreaAging(grayData: Buffer, width: number, height: number): number {
    const eyeY = Math.floor(height * 0.4)
    let agingScore = 0

    for (let y = eyeY - 8; y <= eyeY + 8; y++) {
      for (let x = Math.floor(width * 0.2); x < Math.floor(width * 0.8); x++) {
        if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
          const current = grayData[y * width + x]
          const right = grayData[y * width + (x + 1)]
          const down = grayData[(y + 1) * width + x]

          const horizontalGrad = Math.abs(current - right)
          const verticalGrad = Math.abs(current - down)

          if (horizontalGrad > 15 || verticalGrad > 15) {
            agingScore += 1
          }
        }
      }
    }

    return Math.min(1, agingScore / (width * 16))
  }

  private calculateSharpness(data: Buffer, width: number, height: number): number {
    let sharpness = 0

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

    return Math.min(1, sharpness / (width * height * 255))
  }

  private generateStateDescription(age: number, gender: string, quality: number): string {
    const parts: string[] = []

    // Age group
    let ageGroup = 'người trẻ'
    if (age < 18) ageGroup = 'học sinh'
    else if (age < 25) ageGroup = 'sinh viên'
    else if (age < 35) ageGroup = 'người trẻ'
    else if (age < 50) ageGroup = 'người trung niên'
    else ageGroup = 'người lớn tuổi'

    parts.push(`${ageGroup} ${gender}`)

    // Quality indicator
    if (quality > 0.8) parts.push('ảnh chất lượng cao')
    else if (quality > 0.6) parts.push('ảnh chất lượng tốt')

    // Default appearance
    parts.push('da vàng')

    if (gender === 'nam') {
      parts.push('đẹp trai')
    } else {
      parts.push('xinh đẹp')
    }

    return parts.join(', ')
  }

  private l2Normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) return vector
    return vector.map((val) => val / norm)
  }

  private calculateSimilarity(embedding1: number[], embedding2: number[], quality1 = 1, quality2 = 1): number {
    if (embedding1.length !== embedding2.length) return 0

    let dotProduct = 0,
      norm1 = 0,
      norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    if (norm1 === 0 || norm2 === 0) return 0
    const cosineSim = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
    const qualityWeight = Math.sqrt(quality1 * quality2)

    return cosineSim * qualityWeight
  }

  // Utility methods
  private convertClassToAge(className: string): number {
    if (!className) return 18
    const gradeMatch = className.match(/^(\d{1,2})/)
    if (!gradeMatch) return 18
    const grade = parseInt(gradeMatch[0])
    if (grade >= 1 && grade <= 12) return 5 + grade
    if (grade >= 13 && grade <= 16) return 18 + (grade - 13)
    return 18
  }

  private getAgeGroupFromClass(className: string): string {
    const age = this.convertClassToAge(className)
    if (age <= 10) return 'học sinh tiểu học'
    else if (age <= 14) return 'học sinh trung học cơ sở'
    else if (age <= 17) return 'học sinh trung học phổ thông'
    else if (age <= 22) return 'sinh viên'
    else return 'người trẻ'
  }

  // 🔥 FIXED: Properly upload to S3
  async uploadProfileImageToS3(userId: string, imageBuffer: Buffer): Promise<string> {
    try {
      const timestamp = Date.now()
      const filename = `profiles/${userId}/${timestamp}.jpg`

      // Create a temporary file
      const tempDir = path.join(process.cwd(), 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      const tempFilePath = path.join(tempDir, `${timestamp}.jpg`)

      // Write buffer to temp file
      fs.writeFileSync(tempFilePath, imageBuffer)

      console.log(`📤 Uploading profile image to S3: ${filename}`)

      // Upload to S3 using existing utility
      await uploadFileS3({
        filename,
        filePath: tempFilePath,
        contentType: 'image/jpeg'
      })

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      const imageUrl = `https://${envConfig.Bucket_Name}.s3.${envConfig.region}.amazonaws.com/${filename}`
      console.log(`✅ Profile image uploaded successfully: ${imageUrl}`)

      return imageUrl
    } catch (error: any) {
      console.error('Failed to upload profile image to S3:', error)
      throw new Error(`S3 upload failed: ${error.message}`)
    }
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    try {
      const result = await databaseService.users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { avatar: avatarUrl, updated_at: new Date() } }
      )
      return result.modifiedCount > 0
    } catch (error) {
      console.error('Error updating user avatar:', error)
      return false
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    models: {
      scrfd: boolean
      genderage: boolean
      arcface_r34: boolean
    }
    pipeline_ready: boolean
    ai_ready: boolean
  }> {
    await this.ensureInitialized()

    const models = {
      scrfd: this.scrfdSession !== null,
      genderage: this.genderAgeSession !== null,
      arcface_r34: this.embeddingSession !== null
    }

    const pipeline_ready = models.arcface_r34 // ArcFace R34 is essential
    const ai_ready = !!this.geminiModel && !!process.env.GERMINI_API_KEY

    return {
      status: pipeline_ready && ai_ready ? 'healthy' : 'unhealthy',
      models,
      pipeline_ready,
      ai_ready
    }
  }
}

const faceEmbeddingServices = new CompleteFaceAnalysisService()
export default faceEmbeddingServices
