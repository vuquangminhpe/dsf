import { GradeLevel } from '~/models/schemas/Subject.schema'

export const SUBJECTS_BY_GRADE_LEVEL = {
  [GradeLevel.Elementary]: [
    { name: 'Tiếng Việt', code: 'TV', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Toán', code: 'TOAN', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Tiếng Anh', code: 'TA', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Đạo đức', code: 'DD', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Tự nhiên và Xã hội', code: 'TNXH', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Khoa học', code: 'KH', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Lịch sử và Địa lý', code: 'LSDL', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Tin học', code: 'TH', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Công nghệ', code: 'CN', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Giáo dục thể chất', code: 'GDTC', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Âm nhạc', code: 'AN', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Mỹ thuật', code: 'MT', is_main_subject: false, evaluation_type: 'comment' }
  ],

  [GradeLevel.MiddleSchool]: [
    { name: 'Ngữ văn', code: 'NV', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Toán', code: 'TOAN', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Tiếng Anh', code: 'TA', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Giáo dục công dân', code: 'GDCD', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Khoa học Tự nhiên', code: 'KHTN', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Lịch sử và Địa lí', code: 'LSDL', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Công nghệ', code: 'CN', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Tin học', code: 'TH', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Giáo dục thể chất', code: 'GDTC', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Nghệ thuật', code: 'NT', is_main_subject: false, evaluation_type: 'comment' }
  ],

  [GradeLevel.HighSchool]: [
    // Môn bắt buộc
    { name: 'Ngữ văn', code: 'NV', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Toán', code: 'TOAN', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Tiếng Anh', code: 'TA', is_main_subject: true, evaluation_type: 'both' },
    { name: 'Lịch sử', code: 'LS', is_main_subject: true, evaluation_type: 'both' },

    // Môn lựa chọn
    { name: 'Địa lí', code: 'DL', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Giáo dục kinh tế và pháp luật', code: 'GDKTPL', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Vật lí', code: 'LY', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Hóa học', code: 'HOA', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Sinh học', code: 'SINH', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Công nghệ', code: 'CN', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Tin học', code: 'TH', is_main_subject: false, evaluation_type: 'both' },
    { name: 'Âm nhạc', code: 'AN', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Mỹ thuật', code: 'MT', is_main_subject: false, evaluation_type: 'comment' },

    // Hoạt động giáo dục bắt buộc
    { name: 'Giáo dục thể chất', code: 'GDTC', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Giáo dục quốc phòng và an ninh', code: 'GDQPAN', is_main_subject: false, evaluation_type: 'comment' },
    { name: 'Hoạt động trải nghiệm, hướng nghiệp', code: 'HDTNHN', is_main_subject: false, evaluation_type: 'comment' }
  ]
}
