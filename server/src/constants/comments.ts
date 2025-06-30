export interface IComment {
  id: string
  content: string
  type: 'STRENGTH' | 'WEAKNESS' | 'PROGRESS'
  category: 'EXCELLENT' | 'GOOD' | 'AVERAGE_HIGH' | 'AVERAGE' | 'BELOW_AVERAGE' | 'POOR'
  grade_level?: 'elementary' | 'middle_school' | 'high_school'
  subject_type?: 'main' | 'secondary' | 'general' // môn chính, phụ, chung
}

export const STRENGTH_COMMENTS: IComment[] = [
  // Học sinh xuất sắc (9.0+) - 25 nhận xét
  {
    id: 'S001',
    content: 'Nắm vững kiến thức, vận dụng kỹ năng một cách sáng tạo và hiệu quả.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S002',
    content: 'Tư duy logic tốt, khả năng phân tích và tổng hợp xuất sắc.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S003',
    content: 'Có khả năng tự học cao, chủ động trong việc nghiên cứu và khám phá kiến thức mới.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S004',
    content: 'Thể hiện năng lực lãnh đạo tốt trong các hoạt động nhóm.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S005',
    content: 'Có khả năng sáng tạo, đưa ra nhiều ý tưởng mới mẻ và độc đáo.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S006',
    content: 'Thể hiện khả năng tư duy phản biện, đánh giá vấn đề một cách khách quan.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S007',
    content: 'Có tài năng đặc biệt, khả năng học hỏi và tiếp thu vượt trội.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S008',
    content: 'Thường xuyên đặt câu hỏi sâu sắc, góp phần làm phong phú bài học.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S009',
    content: 'Có khả năng tổng hợp kiến thức từ nhiều nguồn khác nhau một cách hiệu quả.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S010',
    content: 'Thể hiện tính tự chủ cao trong học tập, có kế hoạch học tập rõ ràng.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S011',
    content: 'Có khả năng ứng dụng kiến thức vào thực tiễn một cách linh hoạt.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S012',
    content: 'Thể hiện tinh thần nghiên cứu khoa học, ham học hỏi.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S013',
    content: 'Có khả năng thuyết trình, diễn đạt ý tưởng một cách thuyết phục.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S014',
    content: 'Thể hiện tư duy logic chặt chẽ trong việc giải quyết vấn đề.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S015',
    content: 'Có khả năng dẫn dắt và hỗ trợ bạn bè trong học tập hiệu quả.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S016',
    content: 'Thể hiện sự kiên trì, bền bỉ trong việc tìm tòi kiến thức.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S017',
    content: 'Có khả năng liên kết kiến thức giữa các môn học một cách sáng tạo.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S018',
    content: 'Thường xuyên tìm hiểu thêm kiến thức ngoài chương trình học.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S019',
    content: 'Có khả năng đánh giá và phân tích thông tin một cách chính xác.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S020',
    content: 'Thể hiện tính độc lập và tự tin trong việc thể hiện quan điểm cá nhân.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S021',
    content: 'Có khả năng tư duy mở, tiếp thu ý kiến đóng góp một cách tích cực.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S022',
    content: 'Thể hiện tinh thần trách nhiệm cao với bản thân và cộng đồng.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S023',
    content: 'Có khả năng tổ chức và quản lý thời gian học tập hiệu quả.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S024',
    content: 'Thể hiện sự nhạy bén trong việc nắm bắt kiến thức mới.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },
  {
    id: 'S025',
    content: 'Có năng lực đặc biệt trong việc giải quyết các bài toán phức tạp.',
    type: 'STRENGTH',
    category: 'EXCELLENT'
  },

  // Học sinh giỏi (8.0-8.9) - 20 nhận xét
  {
    id: 'S026',
    content: 'Hiểu bài nhanh, ghi nhớ kiến thức tốt và vận dụng đúng.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S027',
    content: 'Tích cực tham gia các hoạt động học tập, có tinh thần hợp tác cao.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S028',
    content: 'Làm bài cẩn thận, chính xác, ít mắc lỗi sai sót.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S029',
    content: 'Có khả năng trình bày ý tưởng rõ ràng, mạch lạc.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S030',
    content: 'Thái độ học tập nghiêm túc, có ý thức tự giác cao.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S031',
    content: 'Có khả năng phân tích và tổng hợp thông tin tốt.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S032',
    content: 'Thể hiện sự tập trung cao độ trong quá trình học tập.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S033',
    content: 'Có khả năng ghi chép và tổ chức kiến thức một cách khoa học.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S034',
    content: 'Thường xuyên hoàn thành bài tập đúng hạn và chất lượng.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S035',
    content: 'Có khả năng đặt câu hỏi phù hợp và tham gia thảo luận tích cực.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S036',
    content: 'Thể hiện sự kiên nhẫn và cẩn thận trong việc giải bài tập.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S037',
    content: 'Có thái độ tôn trọng và lắng nghe ý kiến của thầy cô, bạn bè.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S038',
    content: 'Thể hiện khả năng ghi nhớ và tái hiện kiến thức chính xác.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S039',
    content: 'Có ý thức tự học và tự rèn luyện để nâng cao kiến thức.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S040',
    content: 'Thể hiện sự logic và mạch lạc trong việc trình bày bài làm.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S041',
    content: 'Có khả năng vận dụng kiến thức để giải quyết bài tập mới.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S042',
    content: 'Thể hiện tinh thần học hỏi và không ngại khó.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S043',
    content: 'Có khả năng tự kiểm tra và đánh giá kết quả bài làm.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S044',
    content: 'Thể hiện sự chủ động trong việc tìm hiểu bài học.',
    type: 'STRENGTH',
    category: 'GOOD'
  },
  {
    id: 'S045',
    content: 'Có thái độ nghiêm túc và tập trung trong giờ học.',
    type: 'STRENGTH',
    category: 'GOOD'
  },

  // Học sinh khá (7.0-7.9) - 15 nhận xét
  {
    id: 'S046',
    content: 'Nắm được kiến thức cơ bản, có thể vận dụng trong các tình huống quen thuộc.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S047',
    content: 'Có khả năng làm việc nhóm tốt, biết lắng nghe và chia sẻ ý kiến.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S048',
    content: 'Thực hiện đầy đủ các bài tập được giao, có tinh thần trách nhiệm.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S049',
    content: 'Có thái độ học tập tích cực, sẵn sàng nhận góp ý từ thầy cô.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S050',
    content: 'Biết tự đánh giá kết quả học tập của bản thân.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S051',
    content: 'Thể hiện sự cố gắng và nỗ lực trong học tập.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S052',
    content: 'Có khả năng hoàn thành các nhiệm vụ học tập cơ bản.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S053',
    content: 'Thể hiện thái độ tích cực trong các hoạt động tập thể.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S054',
    content: 'Có ý thức tham gia đầy đủ các tiết học.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S055',
    content: 'Thể hiện sự tôn trọng và lịch sự với mọi người.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S056',
    content: 'Có khả năng tiếp thu và ghi nhớ kiến thức ở mức độ cơ bản.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S057',
    content: 'Thể hiện tinh thần hợp tác trong các hoạt động nhóm.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S058',
    content: 'Có thái độ cẩn thận trong việc làm bài và ghi chép.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S059',
    content: 'Thể hiện sự kiên trì trong việc hoàn thành bài tập.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'S060',
    content: 'Có ý thức chấp hành kỷ luật và nội quy lớp học.',
    type: 'STRENGTH',
    category: 'AVERAGE_HIGH'
  },

  // Học sinh trung bình (5.0-6.9) - 15 nhận xét
  {
    id: 'S061',
    content: 'Có cố gắng trong học tập, thái độ nghiêm túc với bài vở.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S062',
    content: 'Tham gia đầy đủ các hoạt động học tập theo yêu cầu của giáo viên.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S063',
    content: 'Có tinh thần đoàn kết, giúp đỡ bạn bè trong học tập.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S064',
    content: 'Biết tôn trọng thầy cô và bạn bè, có thái độ lịch sự.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S065',
    content: 'Có ý thức chấp hành nội quy, quy định của lớp và nhà trường.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S066',
    content: 'Thể hiện sự chăm chỉ và không bỏ cuộc trong học tập.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S067',
    content: 'Có thái độ tích cực trong việc tham gia các hoạt động lớp.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S068',
    content: 'Thể hiện tính chu đáo và quan tâm đến bạn bè.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S069',
    content: 'Có ý thức bảo vệ tài sản chung và giữ gìn vệ sinh.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S070',
    content: 'Thể hiện sự ngoan ngoãn và dễ dạy.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S071',
    content: 'Có thái độ lắng nghe và tiếp thu ý kiến từ thầy cô.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S072',
    content: 'Thể hiện sự đứng đắn trong ứng xử và giao tiếp.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S073',
    content: 'Có tinh thần trách nhiệm với nhiệm vụ được giao.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S074',
    content: 'Thể hiện sự thành thật và chân thành trong học tập.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  },
  {
    id: 'S075',
    content: 'Có thái độ tôn trọng và biết ơn sự dạy dỗ của thầy cô.',
    type: 'STRENGTH',
    category: 'AVERAGE'
  }
]

// ===== NHẬN XÉT HẠN CHE CẦN KHẮC PHỤC =====
export const WEAKNESS_COMMENTS: IComment[] = [
  // Học sinh yếu kém (dưới 5.0)
  {
    id: 'W001',
    content: 'Cần củng cố kiến thức cơ bản để có nền tảng vững chắc.',
    type: 'WEAKNESS',
    category: 'BELOW_AVERAGE'
  },
  {
    id: 'W002',
    content: 'Cần tăng cường thời gian ôn tập và làm bài tập.',
    type: 'WEAKNESS',
    category: 'BELOW_AVERAGE'
  },
  {
    id: 'W003',
    content: 'Cần chú ý nghe giảng và ghi chép bài học đầy đủ.',
    type: 'WEAKNESS',
    category: 'BELOW_AVERAGE'
  },
  {
    id: 'W004',
    content: 'Cần có phương pháp học tập phù hợp và hiệu quả hơn.',
    type: 'WEAKNESS',
    category: 'BELOW_AVERAGE'
  },
  {
    id: 'W005',
    content: 'Cần tích cực hơn trong việc đặt câu hỏi khi chưa hiểu bài.',
    type: 'WEAKNESS',
    category: 'BELOW_AVERAGE'
  },

  // Học sinh kém (dưới 3.5)
  {
    id: 'W006',
    content: 'Cần được hỗ trợ đặc biệt để bắt kịp chương trình học.',
    type: 'WEAKNESS',
    category: 'POOR'
  },
  {
    id: 'W007',
    content: 'Cần có sự đồng hành và giúp đỡ từ gia đình trong học tập.',
    type: 'WEAKNESS',
    category: 'POOR'
  },
  {
    id: 'W008',
    content: 'Cần xây dựng lại động lực và hứng thú học tập.',
    type: 'WEAKNESS',
    category: 'POOR'
  },
  {
    id: 'W009',
    content: 'Cần tham gia các lớp học phụ đạo để củng cố kiến thức.',
    type: 'WEAKNESS',
    category: 'POOR'
  },

  // Hạn chế chung cho tất cả các mức
  {
    id: 'W010',
    content: 'Cần cải thiện kỹ năng trình bày bài làm rõ ràng, mạch lạc hơn.',
    type: 'WEAKNESS',
    category: 'AVERAGE'
  },
  {
    id: 'W011',
    content: 'Cần tăng cường kỹ năng làm việc nhóm và giao tiếp.',
    type: 'WEAKNESS',
    category: 'AVERAGE'
  },
  {
    id: 'W012',
    content: 'Cần chủ động hơn trong việc nêu ý kiến và thảo luận.',
    type: 'WEAKNESS',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'W013',
    content: 'Cần kiểm tra kỹ bài làm trước khi nộp để tránh sai sót.',
    type: 'WEAKNESS',
    category: 'GOOD'
  },
  {
    id: 'W014',
    content: 'Cần phát triển tư duy sáng tạo và khả năng ứng biến.',
    type: 'WEAKNESS',
    category: 'GOOD'
  },
  {
    id: 'W015',
    content: 'Cần tăng cường đọc sách và tài liệu tham khảo.',
    type: 'WEAKNESS',
    category: 'AVERAGE_HIGH'
  }
]

// ===== NHẬN XÉT VỀ SỰ TIẾN BỘ =====
export const PROGRESS_COMMENTS: IComment[] = [
  // Tiến bộ vượt bậc
  {
    id: 'P001',
    content: 'Có sự tiến bộ vượt bậc so với đầu năm học, đáng được ghi nhận.',
    type: 'PROGRESS',
    category: 'EXCELLENT'
  },
  {
    id: 'P002',
    content: 'Từ những khó khăn ban đầu, em đã vươn lên mạnh mẽ và đạt kết quả tốt.',
    type: 'PROGRESS',
    category: 'EXCELLENT'
  },

  // Tiến bộ rõ rệt
  {
    id: 'P003',
    content: 'Có sự tiến bộ rõ rệt trong việc nắm bắt và vận dụng kiến thức.',
    type: 'PROGRESS',
    category: 'GOOD'
  },
  {
    id: 'P004',
    content: 'Thái độ học tập ngày càng tích cực, có nhiều cố gắng đáng khen.',
    type: 'PROGRESS',
    category: 'GOOD'
  },
  {
    id: 'P005',
    content: 'Kỹ năng làm bài và trình bày được cải thiện đáng kể.',
    type: 'PROGRESS',
    category: 'GOOD'
  },

  // Tiến bộ từng bước
  {
    id: 'P006',
    content: 'Có sự tiến bộ từng bước, cần tiếp tục duy trì để đạt kết quả tốt hơn.',
    type: 'PROGRESS',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'P007',
    content: 'Bắt đầu thể hiện sự tự tin hơn trong học tập và giao tiếp.',
    type: 'PROGRESS',
    category: 'AVERAGE_HIGH'
  },
  {
    id: 'P008',
    content: 'Có dấu hiệu tích cực trong việc chủ động học tập.',
    type: 'PROGRESS',
    category: 'AVERAGE_HIGH'
  },

  // Tiến bộ chậm
  {
    id: 'P009',
    content: 'Có sự tiến bộ nhưng còn chậm, cần nỗ lực nhiều hơn.',
    type: 'PROGRESS',
    category: 'AVERAGE'
  },
  {
    id: 'P010',
    content: 'Đã có những thay đổi tích cực nhưng cần kiên trì để duy trì.',
    type: 'PROGRESS',
    category: 'AVERAGE'
  },

  // Cần nỗ lực hơn
  {
    id: 'P011',
    content: 'Cần có sự nỗ lực và cố gắng nhiều hơn để có tiến bộ rõ rệt.',
    type: 'PROGRESS',
    category: 'BELOW_AVERAGE'
  },
  {
    id: 'P012',
    content: 'Với sự hỗ trợ phù hợp, em có thể đạt được tiến bộ tốt hơn.',
    type: 'PROGRESS',
    category: 'BELOW_AVERAGE'
  }
]

// ===== FUNCTION HELPER ĐỂ LỌC NHẬN XÉT =====

/**
 * Xác định category dựa trên điểm trung bình
 */
export function getStudentCategory(averageScore: number): IComment['category'] {
  if (averageScore >= 9.0) return 'EXCELLENT'
  if (averageScore >= 8.0) return 'GOOD'
  if (averageScore >= 7.0) return 'AVERAGE_HIGH'
  if (averageScore >= 5.0) return 'AVERAGE'
  if (averageScore >= 3.5) return 'BELOW_AVERAGE'
  return 'POOR'
}

/**
 * Lọc nhận xét theo loại và category
 */
export function getCommentsByType(
  type: IComment['type'],
  category: IComment['category'],
  gradeLevel?: IComment['grade_level']
): IComment[] {
  let comments: IComment[] = []

  switch (type) {
    case 'STRENGTH':
      comments = STRENGTH_COMMENTS
      break
    case 'WEAKNESS':
      comments = WEAKNESS_COMMENTS
      break
    case 'PROGRESS':
      comments = PROGRESS_COMMENTS
      break
  }

  // Lọc theo category
  comments = comments.filter((comment) => comment.category === category)

  // Lọc theo grade_level nếu có
  if (gradeLevel) {
    comments = comments.filter((comment) => !comment.grade_level || comment.grade_level === gradeLevel)
  }

  return comments
}

/**
 * Lấy nhận xét thông minh dựa trên điểm số
 */
export function getSmartComments(
  averageScore: number,
  type: IComment['type'],
  gradeLevel?: IComment['grade_level']
): IComment[] {
  const category = getStudentCategory(averageScore)
  return getCommentsByType(type, category, gradeLevel)
}

/**
 * Tính điểm trung bình môn học
 */
export function calculateSubjectAverage(scores: {
  tx: number[] // Điểm thường xuyên
  gk: number // Điểm giữa kỳ
  ck: number // Điểm cuối kỳ
}): number {
  // Theo quy định: TX (hệ số 1), GK (hệ số 2), CK (hệ số 3)
  const txAverage = scores.tx.length > 0 ? scores.tx.reduce((sum, score) => sum + score, 0) / scores.tx.length : 0

  const totalWeight = 1 + 2 + 3 // 6
  const weightedSum = txAverage * 1 + scores.gk * 2 + scores.ck * 3

  return Math.round((weightedSum / totalWeight) * 10) / 10 // Làm tròn 1 chữ số thập phân
}

// Export tất cả comments để sử dụng
export const ALL_COMMENTS = [...STRENGTH_COMMENTS, ...WEAKNESS_COMMENTS, ...PROGRESS_COMMENTS]
