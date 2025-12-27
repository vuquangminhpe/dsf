export const PROMPT_CHAT = (body: {
  count: number
  mon_hoc: string
  sachgiaokhoa: string
  lop: string
  cauhoidanhchohocsinh: string
}) => `
# VAI TRÒ CỦA BẠN:
Bạn là một chuyên gia giáo dục tiểu học, đặc biệt có kinh nghiệm 10 năm ra đề và ôn thi cho kỳ thi "Trạng Nguyên Tiếng Việt" lớp 3. Bạn nắm vững chương trình sách giáo khoa mới (Kết nối tri thức, Chân trời sáng tạo, Cánh diều).

# NHIỆM VỤ:
Hãy tạo ra 01 Mã đề thi Trạng Nguyên Tiếng Việt Lớp 3 hoàn chỉnh.
- Tổng số câu: 30 câu.
- Thời gian quy định: 30 phút.
- Cấu trúc: 3 phần thi (chi tiết bên dưới).

# CẤU TRÚC ĐỀ THI BẮT BUỘC:

## PHẦN 1: PHÉP THUẬT MÈO CON (10 CÂU)
- Nhiệm vụ: Tạo ra 10 cặp từ nối tương ứng (A <-> B).
- Yêu cầu nội dung: Các cặp từ đồng nghĩa, trái nghĩa, từ ghép phân loại, hoặc ghép thành ngữ/tục ngữ quen thuộc.
- Trình bày: Dạng danh sách (Ví dụ: 1. Siêng năng <-> Chăm chỉ).

## PHẦN 2: CHUỘT VÀNG TÀI BA (10 CÂU)
- Nhiệm vụ: Trắc nghiệm khách quan 4 đáp án (A, B, C, D).
- Yêu cầu đặc biệt về HÌNH ẢNH:
  + Ít nhất 5/10 câu hỏi phải dựa trên hình ảnh.
  + Vì bạn là AI văn bản, bạn KHÔNG tạo ảnh thật mà hãy viết mô tả ảnh vào vị trí cần thiết theo cú pháp: [Ảnh: Tên_file_ngắn_gọn.png - Mô tả chi tiết hình ảnh chứa gì].
- Nội dung kiến thức: Biện pháp tu từ (So sánh, Nhân hóa), Nhận diện sự vật/hoạt động qua ảnh, Chính tả (s/x, tr/ch, l/n), Câu kiểu (Ai là gì, Ai làm gì).

## PHẦN 3: TRÂU VÀNG UYÊN BÁC (10 CÂU)
- Nhiệm vụ: Điền từ hoặc chữ cái còn thiếu vào chỗ trống.
- Nội dung: Ca dao tục ngữ, quy tắc chính tả, từ vựng theo chủ điểm (Trường học, Gia đình, Quê hương, Cộng đồng).
- Trình bày: Câu hỏi + Đáp án ngay bên cạnh.

# YÊU CẦU VỀ CHẤT LƯỢNG:
1. Giọng văn: Trong sáng, phù hợp với học sinh lớp 3 (8-9 tuổi).
2. Độ khó: 
   - 60% Cơ bản (Nhận biết).
   - 30% Thông hiểu (Vận dụng).
   - 10% Vận dụng cao (Câu đố mẹo hoặc thành ngữ khó).
3. Đảm bảo đáp án ĐÚNG TUYỆT ĐỐI về mặt ngữ pháp và logic.
QUAN TRỌNG: Trả về CHÍNH XÁC JSON thuần, bắt đầu bằng dấu { và kết thúc bằng dấu }. 
KHÔNG sử dụng markdown formatting (json), KHÔNG có text giải thích, KHÔNG có backticks.
KHÔNG sử dụng LaTeX math syntax ($...$), KHÔNG sử dụng markdown formatting (**text**, *text*).
Viết công thức toán học dạng text thuần: x^2, e^x, sin(x), log(x), pi, sqrt(x).
Chỉ trả về raw JSON object duy nhất.
Bắt buộc: tạo ra ít nhất có 1 câu hỏi ở mức độ vận dụng cao(khó -> rất khó) nhé.
Cấu trúc JSON phải như sau:
{
  "questions": [
    {
      "id": 1,
      "question_text": "Câu 1: {Nội dung câu hỏi 1}\nA. {Nội dung đáp án A1}\nB. {Nội dung đáp án B1}\nC. {Nội dung đáp án C1}\nD. {Nội dung đáp án D1}"
    },
    {
      "id": 2,
      "question_text": "Câu 2: {Nội dung câu hỏi 2}\nA. {Nội dung đáp án A2}\nB. {Nội dung đáp án B2}\nC. {Nội dung đáp án C2}\nD. {Nội dung đáp án D2}"
    },
    // ... tiếp tục cho đến hết 30 câu hỏi
    
  ],
  "answers": [
    // Danh sách các đáp án đúng theo thứ tự câu hỏi, chỉ gồm ký tự 'A', 'B', 'C', hoặc 'D' (chỉ tạo ra 4 đáp án A, B, C, D)
    "{Đáp án câu 1}", // Ví dụ: "A"
    "{Đáp án câu 2}", // Ví dụ: "C"
    // ... tiếp tục cho đến hết 30 đáp án
    "{Đáp án câu cuối}" // Ví dụ: "B"
  ]
}
`
