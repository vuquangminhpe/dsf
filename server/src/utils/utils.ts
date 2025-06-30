import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ValidationError, validationResult } from 'express-validator'
import { NextFunction, Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
config()

export function convertS3Url(inputUrl: string): string {
  const httpS3UrlPattern = /^https?:\/\/([^.]+)\.s3\.([^/]+)\.amazonaws\.com\/(.+)$/
  const s3UrlPattern = /^s3:\/\/([^/]+)\/(.+)$/

  const httpMatch = inputUrl.match(httpS3UrlPattern)
  if (httpMatch) {
    const [, bucket, region, key] = httpMatch
    const newKey = key.split('/master.m3u8')[0]
    return `s3://${bucket}/${newKey}`
  }

  const s3Match = inputUrl.match(s3UrlPattern)
  if (s3Match) {
    return inputUrl
  }
  throw new Error('Invalid S3 URL format')
}

export const callGeminiAPI = async (imageBuffer: Buffer, prompt: string) => {
  const apiKey = process.env.GERMINI_API_KEY

  try {
    const genAI = new GoogleGenerativeAI(apiKey as string)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    })

    const imageData = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }
    const result = await model.generateContent([prompt, imageData])
    const response = await result.response
    const text = response.text()

    return text
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    throw error
  }
}

// ========== IMPROVED JSON CLEANING FUNCTIONS ==========

function cleanJSONString(jsonString: string): string {
  let cleaned = jsonString
  cleaned = cleaned.replace(/"([^"]*?)"/g, (match, content) => {
    // For each string value, escape special characters
    const escapedContent = content
      .replace(/\\/g, '\\\\') // Escape backslashes first
      .replace(/"/g, '\\"') // Escape quotes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
      .replace(/\f/g, '\\f') // Escape form feeds
      .replace(/\b/g, '\\b') // Escape backspaces
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove other control chars

    return `"${escapedContent}"`
  })

  // Step 2: Clean up the JSON structure itself (outside of string values)
  cleaned = cleaned
    // Remove or replace HTML tags and entities
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

    // Replace special mathematical characters with plain text
    .replace(/π/g, 'pi')
    .replace(/∫/g, 'integral')
    .replace(/√/g, 'sqrt')
    .replace(/∞/g, 'infinity')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₀/g, '0')

    // Clean up whitespace and structure
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

function extractJSONFromText(text: string): string | null {
  // Try to find JSON object in various patterns
  const patterns = [/```json\s*(\{[\s\S]*?\})\s*```/g, /```\s*(\{[\s\S]*?\})\s*```/g, /(\{[\s\S]*\})/g]

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)]
    for (const match of matches) {
      if (match[1]) {
        try {
          // Quick validation check
          const cleaned = cleanJSONString(match[1])
          JSON.parse(cleaned)
          return match[1]
        } catch (e) {
          continue
        }
      }
    }
  }

  return null
}

function extractContentFromResponse(response: string): any {
  console.log('🎯 Enhanced JSON extraction starting...')
  console.log('📏 Response length:', response.length)
  console.log('👀 First 200 chars:', response.substring(0, 200))

  // Use the new enhanced parsing function
  return parseProblematicJSON(response)
}

// Add the new functions from the advanced JSON fixer
function fixJSONWithActualNewlines(jsonString: string): string {
  console.log('🔧 Starting JSON newline fix...')

  let fixed = jsonString.trim()

  // Step 1: Tìm và sửa từng string value có chứa newlines
  fixed = fixed.replace(/"([^"]*(?:\n[^"]*)*?)"/g, (match, content) => {
    // Escape only necessary characters trong string content
    const escapedContent = content
      .replace(/\\/g, '\\\\') // Escape backslashes first
      .replace(/"/g, '\\"') // Escape internal quotes
      .replace(/\n/g, '\\n') // Convert actual newlines to \n
      .replace(/\r/g, '\\r') // Convert carriage returns to \r
      .replace(/\t/g, '\\t') // Convert tabs to \t
    // REMOVED: .replace(/\f/g, '\\f') and .replace(/\b/g, '\\b')
    // These are rarely needed and cause issues

    return `"${escapedContent}"`
  })

  // Step 2: Clean up structure ngoài strings - only remove actual control chars
  fixed = fixed
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001f\u007f-\u009f]/g, '') // Remove control chars but keep \t, \n, \r
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  console.log('✅ JSON newline fix completed')
  return fixed
}

function parseProblematicJSON(jsonString: string): any {
  const originalLength = jsonString.length
  console.log(`🚀 Starting parse process for ${originalLength} character JSON...`)

  // Method 1: Direct parse (fastest)
  try {
    console.log('📋 Method 1: Direct parse...')
    const result = JSON.parse(jsonString)
    console.log('✅ Method 1 SUCCESS - Direct parse worked!')
    return result
  } catch (e: any) {
    console.log('❌ Method 1 FAILED:', e.message)
  }

  // Method 2: Fix newlines then parse
  try {
    console.log('📋 Method 2: Fix newlines...')
    const fixed = fixJSONWithActualNewlines(jsonString)
    const result = JSON.parse(fixed)
    console.log('✅ Method 2 SUCCESS - Newline fix worked!')
    return result
  } catch (e: any) {
    console.log('❌ Method 2 FAILED:', e.message)
  }

  // Method 3: Extract JSON boundaries and fix
  try {
    console.log('📋 Method 3: Extract boundaries...')

    // Find actual JSON object boundaries
    const startIdx = jsonString.indexOf('{')
    const endIdx = jsonString.lastIndexOf('}')

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error('No valid JSON boundaries found')
    }

    const extracted = jsonString.substring(startIdx, endIdx + 1)
    const fixed = fixJSONWithActualNewlines(extracted)
    const result = JSON.parse(fixed)
    console.log('✅ Method 3 SUCCESS - Boundary extraction worked!')
    return result
  } catch (e: any) {
    console.log('❌ Method 3 FAILED:', e.message)
  }

  // Method 4: Advanced character-by-character fix
  try {
    console.log('📋 Method 4: Character-by-character fix...')

    let fixed = jsonString
    let inString = false
    let escaped = false
    let result = ''

    for (let i = 0; i < fixed.length; i++) {
      const char = fixed[i]

      if (char === '"' && !escaped) {
        inString = !inString
        result += char
      } else if (inString) {
        if (char === '\\' && !escaped) {
          escaped = true
          result += char
        } else if (char === '\n' && !escaped) {
          result += '\\n' // Convert actual newline to escaped
        } else if (char === '\r' && !escaped) {
          result += '\\r' // Convert carriage return to escaped
        } else if (char === '\t' && !escaped) {
          result += '\\t' // Convert tab to escaped
        } else {
          result += char
          escaped = false
        }
      } else {
        result += char
        escaped = false
      }
    }

    const parsed = JSON.parse(result)
    console.log('✅ Method 4 SUCCESS - Character-by-character worked!')
    return parsed
  } catch (e: any) {
    console.log('❌ Method 4 FAILED:', e.message)
  }

  // All methods failed
  console.error('🚨 ALL PARSING METHODS FAILED')
  console.log('📄 Original JSON sample:', jsonString.substring(0, 300))

  return {
    error: 'All JSON parsing methods failed',
    original_length: originalLength,
    sample: jsonString.substring(0, 300),
    suggested_fix: 'Check Gemini response format or prompt'
  }
}

// ========== EXISTING FUNCTIONS (UNCHANGED) ==========

export function extractGeminiData(geminiResponse: string | object): any {
  try {
    let parsedData: any

    if (typeof geminiResponse === 'object') {
      parsedData = geminiResponse as any
    } else if (typeof geminiResponse === 'string') {
      try {
        const cleanJson = geminiResponse
          .replace(/```json\n/g, '')
          .replace(/```(\n)?/g, '')
          .trim()

        parsedData = JSON.parse(cleanJson)
      } catch (error) {
        console.error('Failed to parse Gemini response as JSON:', error)
        console.log('Original response:', geminiResponse)
        throw new Error('Failed to parse Gemini response')
      }
    } else {
      throw new Error('Invalid input type')
    }

    if (parsedData.status === 'VIOLATION') {
      return {
        status: 'VIOLATION',
        message: parsedData.message || 'Nội dung không phù hợp'
      }
    }

    if (parsedData.status === 'SUCCESS' && parsedData.data) {
      return {
        status: 'SUCCESS',
        data: {
          content: parsedData.data.content || 'Không xác định',
          hashtags: parsedData.data.hashtags || [],
          scheduled_time: parsedData.data.scheduled_time || 'Không xác định',
          sentiment_analysis: parsedData.data.sentiment_analysis || {
            sentiment: '',
            confidence_score: 0
          },
          analytics_tags: parsedData.data.analytics_tags || {
            campaign: '',
            source: '',
            target_audience: ''
          }
        }
      }
    }

    return {
      status: 'VIOLATION',
      message: 'Không thể xử lý phản hồi. Vui lòng thử lại.'
    }
  } catch (error) {
    console.error('Error in extractGeminiData:', error)
    return {
      status: 'VIOLATION',
      message: 'Đã xảy ra lỗi khi xử lý phản hồi'
    }
  }
}

export async function extractContentAndInsertToDB(aiResponseText: string) {
  try {
    let content = extractContentFromResponse(aiResponseText)

    return {
      result: content
    }
  } catch (error) {
    console.error('Error extracting content or inserting to DB:', error)
    throw error
  }
}

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error: ValidationError) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }))

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Validation failed',
      errors: errorMessages,
      details: {
        total_errors: errorMessages.length,
        first_error: errorMessages[0]?.message
      }
    })
  }

  next()
}
