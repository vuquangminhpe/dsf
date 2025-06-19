// Constants for Vietnam education system classes
export const VIETNAM_CLASSES = {
  elementary: [
    // Tiểu học (Lớp 1-5)
    '1A',
    '1B',
    '1C',
    '1D',
    '1E',
    '2A',
    '2B',
    '2C',
    '2D',
    '2E',
    '3A',
    '3B',
    '3C',
    '3D',
    '3E',
    '4A',
    '4B',
    '4C',
    '4D',
    '4E',
    '5A',
    '5B',
    '5C',
    '5D',
    '5E'
  ],
  middle_school: [
    // THCS (Lớp 6-9)
    '6A',
    '6B',
    '6C',
    '6D',
    '6E',
    '6A1',
    '6A2',
    '6A3',
    '7A',
    '7B',
    '7C',
    '7D',
    '7E',
    '7A1',
    '7A2',
    '7A3',
    '8A',
    '8B',
    '8C',
    '8D',
    '8E',
    '8A1',
    '8A2',
    '8A3',
    '9A',
    '9B',
    '9C',
    '9D',
    '9E',
    '9A1',
    '9A2',
    '9A3'
  ],
  high_school: [
    // THPT (Lớp 10-12)
    '10A',
    '10B',
    '10C',
    '10D',
    '10E',
    '10A1',
    '10A2',
    '10A3',
    '10A4',
    '10A5',
    '11A',
    '11B',
    '11C',
    '11D',
    '11E',
    '11A1',
    '11A2',
    '11A3',
    '11A4',
    '11A5',
    '12A',
    '12B',
    '12C',
    '12D',
    '12E',
    '12A1',
    '12A2',
    '12A3',
    '12A4',
    '12A5'
  ],
  university: [
    // Đại học
    'K40',
    'K41',
    'K42',
    'K43',
    'K44',
    'K45',
    'K46',
    'K47',
    'K48',
    'K49',
    'Năm 1',
    'Năm 2',
    'Năm 3',
    'Năm 4',
    'Năm 5',
    'CNTT1',
    'CNTT2',
    'CNTT3',
    'CNTT4',
    'KT1',
    'KT2',
    'KT3',
    'KT4',
    'NN1',
    'NN2',
    'NN3',
    'NN4'
  ]
}

// Vietnamese diacritics mapping
const VIETNAMESE_MAP: { [key: string]: string } = {
  à: 'a',
  á: 'a',
  ạ: 'a',
  ả: 'a',
  ã: 'a',
  â: 'a',
  ầ: 'a',
  ấ: 'a',
  ậ: 'a',
  ẩ: 'a',
  ẫ: 'a',
  ă: 'a',
  ằ: 'a',
  ắ: 'a',
  ặ: 'a',
  ẳ: 'a',
  ẵ: 'a',
  è: 'e',
  é: 'e',
  ẹ: 'e',
  ẻ: 'e',
  ẽ: 'e',
  ê: 'e',
  ề: 'e',
  ế: 'e',
  ệ: 'e',
  ể: 'e',
  ễ: 'e',
  ì: 'i',
  í: 'i',
  ị: 'i',
  ỉ: 'i',
  ĩ: 'i',
  ò: 'o',
  ó: 'o',
  ọ: 'o',
  ỏ: 'o',
  õ: 'o',
  ô: 'o',
  ồ: 'o',
  ố: 'o',
  ộ: 'o',
  ổ: 'o',
  ỗ: 'o',
  ơ: 'o',
  ờ: 'o',
  ớ: 'o',
  ợ: 'o',
  ở: 'o',
  ỡ: 'o',
  ù: 'u',
  ú: 'u',
  ụ: 'u',
  ủ: 'u',
  ũ: 'u',
  ư: 'u',
  ừ: 'u',
  ứ: 'u',
  ự: 'u',
  ử: 'u',
  ữ: 'u',
  ỳ: 'y',
  ý: 'y',
  ỵ: 'y',
  ỷ: 'y',
  ỹ: 'y',
  đ: 'd',
  À: 'A',
  Á: 'A',
  Ạ: 'A',
  Ả: 'A',
  Ã: 'A',
  Â: 'A',
  Ầ: 'A',
  Ấ: 'A',
  Ậ: 'A',
  Ẩ: 'A',
  Ẫ: 'A',
  Ă: 'A',
  Ằ: 'A',
  Ắ: 'A',
  Ặ: 'A',
  Ẳ: 'A',
  Ẵ: 'A',
  È: 'E',
  É: 'E',
  Ẹ: 'E',
  Ẻ: 'E',
  Ẽ: 'E',
  Ê: 'E',
  Ề: 'E',
  Ế: 'E',
  Ệ: 'E',
  Ể: 'E',
  Ễ: 'E',
  Ì: 'I',
  Í: 'I',
  Ị: 'I',
  Ỉ: 'I',
  Ĩ: 'I',
  Ò: 'O',
  Ó: 'O',
  Ọ: 'O',
  Ỏ: 'O',
  Õ: 'O',
  Ô: 'O',
  Ồ: 'O',
  Ố: 'O',
  Ộ: 'O',
  Ổ: 'O',
  Ỗ: 'O',
  Ơ: 'O',
  Ờ: 'O',
  Ớ: 'O',
  Ợ: 'O',
  Ở: 'O',
  Ỡ: 'O',
  Ù: 'U',
  Ú: 'U',
  Ụ: 'U',
  Ủ: 'U',
  Ũ: 'U',
  Ư: 'U',
  Ừ: 'U',
  Ứ: 'U',
  Ự: 'U',
  Ử: 'U',
  Ữ: 'U',
  Ỳ: 'Y',
  Ý: 'Y',
  Ỵ: 'Y',
  Ỷ: 'Y',
  Ỹ: 'Y',
  Đ: 'D'
}

/**
 * Convert Vietnamese name to username (no diacritics, no spaces, lowercase)
 * Example: "Nguyễn Hải Nam" -> "nguyenhainam"
 */
export function generateUsernameFromName(fullName: string): string {
  return fullName
    .split('')
    .map((char) => VIETNAMESE_MAP[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .replace(/\s+/g, '') // Remove spaces
}

/**
 * Generate random password with specific pattern
 * Pattern: [student_class][random_4_digits]
 * Example: "8a1234", "12b5678"
 */
export function generateRandomPassword(studentClass: string): string {
  const classPrefix = studentClass.toLowerCase().replace(/[^a-z0-9]/g, '')
  const randomNumbers = Math.floor(1000 + Math.random() * 9000) // 4-digit random number
  return `${classPrefix}${randomNumbers}`
}

/**
 * Generate alternative username if duplicate exists
 * Example: "nguyenhainam" -> "nguyenhainam1", "nguyenhainam2"
 */
export function generateAlternativeUsername(baseUsername: string, existingUsernames: string[]): string {
  let counter = 1
  let newUsername = baseUsername

  while (existingUsernames.includes(newUsername)) {
    newUsername = `${baseUsername}${counter}`
    counter++
  }

  return newUsername
}

/**
 * Validate Vietnamese name
 */
export function isValidVietnameseName(name: string): boolean {
  const vietnameseNameRegex =
    /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/
  return vietnameseNameRegex.test(name.trim()) && name.trim().length >= 2
}

/**
 * Get classes by teacher level
 */
export function getClassesByLevel(level: string): string[] {
  switch (level) {
    case 'elementary':
      return VIETNAM_CLASSES.elementary
    case 'middle_school':
      return VIETNAM_CLASSES.middle_school
    case 'high_school':
      return VIETNAM_CLASSES.high_school
    case 'university':
      return VIETNAM_CLASSES.university
    default:
      return []
  }
}

/**
 * Get age range by class
 */
export function getAgeRangeByClass(className: string): [number, number] {
  const classNumber = parseInt(className.match(/\d+/)?.[0] || '0')

  if (classNumber >= 1 && classNumber <= 5) {
    // Tiểu học: 6-11 tuổi
    return [5 + classNumber, 6 + classNumber]
  } else if (classNumber >= 6 && classNumber <= 9) {
    // THCS: 11-15 tuổi
    return [5 + classNumber, 6 + classNumber]
  } else if (classNumber >= 10 && classNumber <= 12) {
    // THPT: 15-18 tuổi
    return [5 + classNumber, 6 + classNumber]
  } else {
    // Đại học: 18-25 tuổi
    return [18, 25]
  }
}

/**
 * Generate student info summary
 */
export function generateStudentSummary(name: string, age: number, gender: string, className: string): string {
  const ageGroup =
    age < 11
      ? 'học sinh tiểu học'
      : age < 15
        ? 'học sinh trung học cơ sở'
        : age < 18
          ? 'học sinh trung học phổ thông'
          : 'sinh viên'

  return `${ageGroup} ${gender}, ${age} tuổi, lớp ${className}`
}
