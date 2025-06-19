import databaseService from '../database.services'
import { ObjectId } from 'mongodb'

interface SearchResult {
  _id: ObjectId
  name: string
  username: string
  avatar: string
  class: string
  role: string
  total_score: number
  state_moment_matches: string[]
  user_age_matches: string[]
  exact_age?: number
  age_difference?: number
  state_moment: string
  user_age: string
  confidence: 'high' | 'medium' | 'low'
  match_reason: string
}

class SearchEngine {
  /**
   * FINAL FIX: Parse search text with proper semantic matching
   */
  private parseSearchTerms(searchText: string) {
    console.log(`🔍 Parsing search text: "${searchText}"`)

    const normalizedText = searchText.toLowerCase().trim()

    // Extract age if present
    const ageMatch = normalizedText.match(/(\d{1,2})\s*tuổi/)
    const targetAge = ageMatch ? parseInt(ageMatch[1]) : null

    console.log(`🎂 Extracted age: ${targetAge}`)

    // Clean text (remove age to avoid duplicates)
    const cleanText = normalizedText.replace(/\d{1,2}\s*tuổi/, '').trim()

    // FIXED: Handle commas and filter properly
    const rawTerms = cleanText
      .split(/[,\s]+/) // Split by comma AND space
      .map((term) => term.trim())
      .filter((term) => term.length > 0 && term !== ',')

    console.log(`📝 Raw terms after cleaning: [${rawTerms.join(', ')}]`)

    // Semantic mappings
    const semanticMappings: { [key: string]: string[] } = {
      // Gender mappings
      'con gái': ['nữ'],
      gái: ['nữ'],
      nữ: ['nữ'],
      'con trai': ['nam'],
      trai: ['nam'],
      nam: ['nam'],

      // Skin color with variations
      'da ngăm': ['da ngăm'],
      'da hơi ngăm': ['da ngăm'],
      ngăm: ['da ngăm'],
      'da vàng': ['da vàng'],
      'da trắng': ['da trắng'],
      'da đen': ['da đen'],

      // Appearance terms
      đẹp: ['đẹp'],
      xinh: ['xinh'],
      'đẹp trai': ['đẹp trai'],
      'xinh đẹp': ['xinh đẹp'],
      'dễ thương': ['dễ thương'],

      // Remove modifier words
      hơi: [],
      rất: [],
      khá: [],
      'tương đối': []
    }

    // Build search terms
    const searchTerms = new Set<string>()
    const exactPhrases = new Set<string>()

    // CRITICAL: If we have target age, add age-related terms for matching
    if (targetAge) {
      console.log(`🎂 Age search detected: ${targetAge} tuổi - adding age terms`)

      // Add age value as search term for user_age matching
      searchTerms.add(targetAge.toString())
      searchTerms.add('tuổi')

      // Add school-level terms based on age for better matching
      if (targetAge >= 6 && targetAge <= 11) {
        searchTerms.add('tiểu học')
      } else if (targetAge >= 11 && targetAge <= 15) {
        searchTerms.add('trung học cơ sở')
        searchTerms.add('cơ sở')
      } else if (targetAge >= 15 && targetAge <= 18) {
        searchTerms.add('trung học phổ thông')
        searchTerms.add('phổ thông')
        searchTerms.add('học sinh')
      } else if (targetAge >= 18) {
        searchTerms.add('sinh viên')
      }

      exactPhrases.add('age_search') // Mark as age-focused search

      // IMPORTANT: If only age search (no other terms), mark as age-only
      if (rawTerms.length === 0) {
        console.log(`🎯 Pure age search - adding age terms to enable matching`)
      }
    }

    // Check full phrase semantic mapping
    if (semanticMappings[cleanText]) {
      console.log(`🎯 Full phrase mapping: "${cleanText}" → [${semanticMappings[cleanText].join(', ')}]`)
      semanticMappings[cleanText].forEach((term) => {
        if (term) searchTerms.add(term) // Skip empty mappings
      })
      exactPhrases.add(cleanText)
    } else if (rawTerms.length > 0) {
      // Process individual terms
      rawTerms.forEach((term) => {
        if (semanticMappings[term]) {
          console.log(`🎯 Term mapping: "${term}" → [${semanticMappings[term].join(', ')}]`)
          semanticMappings[term].forEach((mappedTerm) => {
            if (mappedTerm) searchTerms.add(mappedTerm) // Skip empty mappings
          })
          if (semanticMappings[term].length > 0) {
            exactPhrases.add(term)
          }
        } else {
          // Add original term (if not a modifier)
          if (!['hơi', 'rất', 'khá', 'tương đối'].includes(term)) {
            searchTerms.add(term)
            console.log(`📝 Direct term: "${term}"`)
          } else {
            console.log(`🚫 Skipping modifier: "${term}"`)
          }
        }
      })
    }

    const result = {
      target_age: targetAge,
      search_terms: Array.from(searchTerms),
      original_terms: rawTerms,
      exact_phrases: Array.from(exactPhrases),
      original_text: cleanText,
      is_age_search: targetAge !== null && rawTerms.length === 0
    }

    console.log(`📝 Final terms for DB matching:`, result.search_terms)
    console.log(`🎂 Age search mode: ${result.is_age_search}`)
    console.log(`✅ Search terms ready:`, result)

    return result
  }

  /**
   * FINAL FIX: Enhanced search with proper debugging and word boundaries
   */
  async searchUsersByText(
    searchText: string,
    userRole: 'student' | 'teacher',
    options: {
      limit?: number
      min_score?: number
      age_priority?: boolean
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 10, min_score = 1, age_priority = true } = options

    console.log(`🔍 MongoDB Search: "${searchText}" for role: ${userRole}`)

    // Parse search terms
    const searchTerms = this.parseSearchTerms(searchText)

    // Build aggregation pipeline
    const pipeline = this.buildSearchPipelineFixed(searchTerms, userRole, { limit, min_score, age_priority })

    // Execute search with comprehensive debugging
    console.log(`🔧 Executing aggregation pipeline...`)
    const results = await databaseService.db.collection('face_embeddings').aggregate(pipeline).toArray()

    console.log(`🎯 Found ${results.length} raw matches`)

    // DEBUG: Log detailed results
    results.forEach((result, index) => {
      console.log(`📄 Raw result ${index + 1}:`, {
        user_id: result.user_id?.toString(),
        total_score: result.total_score,
        state_moment: result.state_moment,
        state_matches: result.state_moment_matches,
        exact_matches: result.exact_phrase_matches
      })
    })

    // Enhanced enrichment with debugging
    const enrichedResults = await this.enrichWithUserDetailsFixed(results, userRole)

    console.log(`👥 Final results: ${enrichedResults.length} users with role ${userRole}`)

    return enrichedResults.slice(0, limit)
  }

  /**
   * WORKING: Fixed search for Vietnamese text
   */
  private buildSearchPipelineFixed(searchTerms: any, userRole: string, options: any) {
    const { target_age, search_terms, exact_phrases, is_age_search } = searchTerms
    const { min_score, age_priority } = options

    console.log(`🏗️ Building pipeline for ${is_age_search ? 'age-only' : 'general'} search`)
    console.log(`🎯 Pipeline input: terms=[${search_terms.join(', ')}], target_age=${target_age}`)

    return [
      // Stage 1: Basic filter
      {
        $match: {
          $and: [
            {
              $or: [
                { state_moment: { $exists: true, $ne: ['', null] } },
                { user_age: { $exists: true, $ne: ['', null] } }
              ]
            },
            { user_id: { $exists: true, $ne: null } }
          ]
        }
      },

      // Stage 2: Add lowercase fields
      {
        $addFields: {
          state_moment_lower: { $toLower: { $ifNull: ['$state_moment', ''] } },
          user_age_lower: { $toLower: { $ifNull: ['$user_age', ''] } }
        }
      },

      // Stage 3: Enhanced matching
      {
        $addFields: {
          state_moment_matches:
            search_terms.length > 0
              ? {
                  $filter: {
                    input: { $split: ['$state_moment_lower', ','] },
                    as: 'item',
                    cond: {
                      $let: {
                        vars: { trimmed: { $trim: { input: '$$item' } } },
                        in: {
                          $and: [
                            { $ne: ['$$trimmed', ''] },
                            {
                              $or: search_terms.map((term: string) => ({
                                $regexMatch: {
                                  input: '$$trimmed',
                                  regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                                  options: 'i'
                                }
                              }))
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              : [],

          user_age_matches:
            search_terms.length > 0
              ? {
                  $filter: {
                    input: { $split: ['$user_age_lower', ','] },
                    as: 'item',
                    cond: {
                      $let: {
                        vars: { trimmed: { $trim: { input: '$$item' } } },
                        in: {
                          $and: [
                            { $ne: ['$$trimmed', ''] },
                            {
                              $or: search_terms.map((term: string) => ({
                                $regexMatch: {
                                  input: '$$trimmed',
                                  regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                                  options: 'i'
                                }
                              }))
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              : [],

          // Extract age
          extracted_age: {
            $let: {
              vars: {
                ageMatch: {
                  $regexFind: {
                    input: '$user_age_lower',
                    regex: '(\\d+)\\s*tuổi',
                    options: 'i'
                  }
                }
              },
              in: {
                $cond: {
                  if: { $ne: ['$$ageMatch', null] },
                  then: { $toInt: { $arrayElemAt: ['$$ageMatch.captures', 0] } },
                  else: null
                }
              }
            }
          }
        }
      },

      // Stage 4: Enhanced scoring
      {
        $addFields: {
          state_score: { $multiply: [{ $size: '$state_moment_matches' }, 15] },
          age_score: { $multiply: [{ $size: '$user_age_matches' }, 10] },

          // Age difference calculation
          age_difference: target_age
            ? {
                $cond: {
                  if: { $ne: ['$extracted_age', null] },
                  then: { $abs: { $subtract: ['$extracted_age', target_age] } },
                  else: 999
                }
              }
            : null,

          // ENHANCED: Age bonus with perfect match detection
          age_bonus: target_age
            ? {
                $cond: {
                  if: { $ne: ['$extracted_age', null] },
                  then: {
                    $switch: {
                      branches: [
                        { case: { $eq: [{ $abs: { $subtract: ['$extracted_age', target_age] } }, 0] }, then: 30 }, // Higher for exact
                        { case: { $lte: [{ $abs: { $subtract: ['$extracted_age', target_age] } }, 1] }, then: 20 },
                        { case: { $lte: [{ $abs: { $subtract: ['$extracted_age', target_age] } }, 2] }, then: 15 },
                        { case: { $lte: [{ $abs: { $subtract: ['$extracted_age', target_age] } }, 3] }, then: 10 }
                      ],
                      default: 0
                    }
                  },
                  else: 0
                }
              }
            : 0,

          // Semantic bonus
          semantic_bonus: {
            $cond: {
              if: {
                $or: [
                  { $gt: [{ $size: '$state_moment_matches' }, 0] },
                  { $gt: [{ $size: '$user_age_matches' }, 0] },
                  // For age-only searches, give bonus if age exists
                  is_age_search ? { $ne: ['$extracted_age', null] } : false
                ]
              },
              then: exact_phrases.length > 0 ? 10 : 5,
              else: 0
            }
          }
        }
      },

      // Stage 5: Total score
      {
        $addFields: {
          total_score: {
            $add: ['$state_score', '$age_score', '$semantic_bonus', '$age_bonus']
          }
        }
      },

      // Stage 6: ENHANCED filtering
      {
        $match: {
          $and: [
            { total_score: { $gte: min_score } },
            {
              $expr: {
                $or: [
                  // Regular matches
                  { $gt: [{ $size: '$state_moment_matches' }, 0] },
                  { $gt: [{ $size: '$user_age_matches' }, 0] },
                  // Age-only searches pass if age exists and bonus > 0
                  is_age_search
                    ? {
                        $and: [{ $ne: ['$extracted_age', null] }, { $gt: ['$age_bonus', 0] }]
                      }
                    : false
                ]
              }
            }
          ]
        }
      },

      // Stage 7: Sort by relevance
      {
        $sort: is_age_search
          ? {
              age_difference: 1, // Age search: sort by age closeness first
              total_score: -1
            }
          : {
              total_score: -1, // Regular search: sort by score first
              age_difference: age_priority && target_age ? 1 : -1
            }
      },

      // Stage 8: Project fields
      {
        $project: {
          user_id: 1,
          total_score: 1,
          state_score: 1,
          age_score: 1,
          age_bonus: 1,
          semantic_bonus: 1,
          state_moment_matches: 1,
          user_age_matches: 1,
          extracted_age: 1,
          age_difference: 1,
          state_moment: 1,
          user_age: 1
        }
      }
    ]
  }

  /**
   * ENHANCED: Better match reason generation
   */
  private generateMatchReasonFixed(result: any): string {
    const reasons = []

    if (result.state_moment_matches && result.state_moment_matches.length > 0) {
      reasons.push(`🎯 Match: ${result.state_moment_matches.slice(0, 3).join(', ')}`)
    }

    if (result.user_age_matches && result.user_age_matches.length > 0) {
      reasons.push(`📅 Age: ${result.user_age_matches.slice(0, 2).join(', ')}`)
    }

    if (result.age_difference === 0) {
      reasons.push('✅ Perfect age')
    } else if (result.age_difference && result.age_difference <= 2) {
      reasons.push(`📊 Close age (±${result.age_difference}y)`)
    }

    if (result.semantic_bonus > 0) {
      reasons.push('🧠 Semantic bonus')
    }

    return reasons.join(' • ') || 'Basic match'
  }

  /**
   * FINAL FIX: Enhanced enrichment with comprehensive debugging
   */
  private async enrichWithUserDetailsFixed(results: any[], userRole: string): Promise<SearchResult[]> {
    if (results.length === 0) {
      console.log(`❌ No raw results to enrich`)
      return []
    }

    const userIds = results.map((r) => r.user_id)
    console.log(
      `🔍 Looking for users with IDs:`,
      userIds.map((id: any) => id?.toString())
    )

    // DEBUG: Check what we have in users collection
    console.log(`🔍 Debugging users collection...`)

    // First, check if these user IDs exist at all
    const allUsers = await databaseService.users.find({ _id: { $in: userIds } }).toArray()

    console.log(`👤 Found ${allUsers.length} total users from ${userIds.length} search IDs`)

    if (allUsers.length > 0) {
      console.log(`📋 All users found:`)
      allUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user._id.toString()}, Role: ${user.role}, Name: ${user.name}`)
      })
    } else {
      console.log(`❌ No users found at all! Check if user_id field in face_embeddings matches _id in users`)

      // DEBUG: Sample a few face_embeddings to see structure
      const sampleEmbeddings = await databaseService.db.collection('face_embeddings').find({}, { limit: 3 }).toArray()

      console.log(`🔍 Sample face_embeddings structure:`)
      sampleEmbeddings.forEach((doc, index) => {
        console.log(`  ${index + 1}. user_id: ${doc.user_id?.toString()}, type: ${typeof doc.user_id}`)
      })

      return []
    }

    // Filter by exact role
    const roleFilteredUsers = allUsers.filter((user) => user.role === userRole)
    console.log(`🎭 Found ${roleFilteredUsers.length} users with exact role "${userRole}"`)

    if (roleFilteredUsers.length === 0) {
      console.log(`❌ Role mismatch! Available roles:`, [...new Set(allUsers.map((u) => u.role))])

      // Try case-insensitive role matching
      const roleInsensitive = allUsers.filter((user) => user.role?.toLowerCase() === userRole.toLowerCase())
      console.log(`🔄 Case-insensitive role match: ${roleInsensitive.length} users`)

      if (roleInsensitive.length > 0) {
        console.log(`💡 Suggestion: Database uses role "${roleInsensitive[0].role}" instead of "${userRole}"`)
      }

      return []
    }

    // Create user lookup map
    const userMap = new Map()
    roleFilteredUsers.forEach((user) => {
      userMap.set(user._id.toString(), user)
    })

    // Combine results with user data
    const enrichedResults: any[] = results
      .map((result) => {
        const user = userMap.get(result.user_id.toString())
        if (!user) {
          console.log(`⚠️ No user found for ID: ${result.user_id.toString()}`)
          return null
        }

        console.log(`✅ Successfully matched user: ${user.name} (${user.role})`)

        return {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          class: user.class,
          role: user.role,

          // Search metrics
          total_score: result.total_score,
          state_moment_matches: result.state_moment_matches || [],
          user_age_matches: result.user_age_matches || [],
          exact_age: result.extracted_age,
          age_difference: result.age_difference,

          // Original data
          state_moment: result.state_moment || '',
          user_age: result.user_age || '',

          // Confidence
          confidence: result.total_score >= 30 ? 'high' : result.total_score >= 15 ? 'medium' : 'low',
          match_reason: this.generateMatchReasonFixed(result)
        }
      })
      .filter((result) => result !== null)

    console.log(`✅ Successfully enriched ${enrichedResults.length} results`)
    return enrichedResults
  }

  /**
   * Enrich results with user details
   */
  private async enrichWithUserDetails(results: any[], userRole: string): Promise<SearchResult[]> {
    if (results.length === 0) return []

    const userIds = results.map((r) => r.user_id)
    const users = await databaseService.users
      .find({
        _id: { $in: userIds },
        role: userRole as any
      })
      .toArray()

    console.log(`👤 Found ${users.length} users with role ${userRole} from ${userIds.length} search results`)

    // Create user lookup map
    const userMap = new Map()
    users.forEach((user) => {
      userMap.set(user._id.toString(), user)
    })

    // Combine results with user data
    const enrichedResults: any[] = results
      .map((result) => {
        const user = userMap.get(result.user_id.toString())
        if (!user) return null

        return {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          class: user.class,
          role: user.role,

          // Search metrics
          total_score: result.total_score,
          state_moment_matches: result.state_moment_matches || [],
          user_age_matches: result.user_age_matches || [],
          exact_age: result.extracted_age,
          age_difference: result.age_difference,

          // Original data
          state_moment: result.state_moment || '',
          user_age: result.user_age || '',

          // Confidence
          confidence: result.total_score >= 30 ? 'high' : result.total_score >= 15 ? 'medium' : 'low',
          match_reason: this.generateMatchReasonFixed(result)
        }
      })
      .filter((result) => result !== null)

    return enrichedResults
  }
}

// Export singleton instance
const searchEngine = new SearchEngine()
export default searchEngine
