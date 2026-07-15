# Hướng dẫn cài đặt & vận hành dự án Drobe (My Closet)

Tài liệu này hướng dẫn chi tiết cách thiết lập dự án **Drobe** từ đầu trên máy tính mới (ví dụ: máy tính công ty của bạn).

---

## 📋 Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính đã cài đặt các phần mềm sau:

1. **Node.js**: Phiên bản 18 trở lên (khuyên dùng v20).
2. **PostgreSQL**: Phiên bản 14 trở lên.
3. **Python**: Phiên bản từ `3.9` đến `3.11` (để chạy server tách nền AI `rembg` local).
4. **Git**: Để tải/quản lý mã nguồn.

---

## 🛠️ Các bước cài đặt chi tiết

### Bước 1: Tải mã nguồn về máy
```bash
git clone <url-repository-cua-ban>
cd MyCloset
```

### Bước 2: Cài đặt Dependencies của Node.js
Dự án sử dụng cấu trúc **Monorepo** (npm workspaces). Bạn chỉ cần chạy lệnh sau ở thư mục gốc của dự án để cài đặt cho cả Frontend, Backend và Shared package:
```bash
npm install
```

### Bước 3: Thiết lập Database (PostgreSQL)
1. Mở công cụ quản trị database của bạn (pgAdmin, DBeaver hoặc CLI) và tạo một database mới tên là:
   ```sql
   CREATE DATABASE mycloset;
   ```
2. Sao chép cấu hình môi trường cho Backend. Tạo một file tên là `.env` đặt bên trong thư mục `backend/` (`backend/.env`) với nội dung sau:
   ```env
   DATABASE_URL="postgresql://postgres:123456@localhost:5432/mycloset?schema=public"
   PORT=3000
   JWT_ACCESS_SECRET="drobe_access_secret_key_12345!@#$"
   JWT_REFRESH_SECRET="drobe_refresh_secret_key_67890!@#$"

   # Cấu hình AI Stylist & AI Auto-Tagging
   OPENAI_API_KEY="sk-proj-JsvkHhLDwbW-1eF3..."
   OPENAI_MODEL="gpt-4o"
   ```
   *(Hãy điều chỉnh tên đăng nhập `postgres`, mật khẩu `123456` và cổng `5432` trong chuỗi `DATABASE_URL` cho đúng với tài khoản PostgreSQL trên máy công ty của bạn)*.

3. Chạy lệnh đẩy cấu trúc bảng database (Prisma Migration) lên PostgreSQL:
   ```bash
   npx prisma db push --schema=backend/prisma/schema.prisma
   ```

### Bước 4: Thiết lập Server tách nền AI (`rembg`) chạy Local
Tách nền bằng AI được thực hiện hoàn toàn offline trên máy tính của bạn thông qua thư viện `rembg`.

1. Mở một terminal mới tại thư mục gốc của dự án và tạo môi trường ảo Python:
   ```bash
   python -m venv venv
   ```
2. Kích hoạt môi trường ảo:
   * **Trên Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Trên Windows (CMD):**
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **Trên macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```
3. Cài đặt thư viện `rembg` phiên bản mới nhất:
   ```bash
   pip install rembg
   ```
4. Khởi động server tách nền AI chạy ở cổng `5000`:
   ```bash
   # Nếu dùng môi trường ảo đã kích hoạt:
   rembg s --host 0.0.0.0 --port 5000
   ```
   *(Trong lần chạy đầu tiên, khi bạn thực hiện tải/tách nền ảnh một sản phẩm, rembg sẽ tự động tải model AI `u2net` về máy khoảng 170MB, các lần sau sẽ chạy ngay lập tức)*.

---

## 🚀 Khởi chạy dự án để phát triển (Development)

Sau khi hoàn thành 4 bước cài đặt trên, mỗi lần mở máy tính làm việc, bạn chỉ cần thực hiện 2 thao tác sau:

1. **Khởi động server AI `rembg`** (trong môi trường ảo Python):
   ```bash
   .\venv\Scripts\activate
   rembg s --host 0.0.0.0 --port 5000
   ```

2. **Khởi chạy ứng dụng Web (Frontend + Backend đồng thời)**:
   Mở một terminal mới tại thư mục gốc của dự án (`MyCloset`) và chạy:
   ```bash
   npm run dev
   ```
   * Hệ thống sẽ tự động khởi chạy đồng thời Backend (cổng `3000`) và Frontend (cổng `5173` hoặc `5174`).
   * Truy cập giao diện ứng dụng tại: **`http://localhost:5173/`** hoặc **`http://localhost:5174/`**

---

## 💡 Lưu ý quan trọng khi chạy trên máy mới

1. **Tránh lỗi CORS khi chỉnh sửa ảnh:**
   * Trình duyệt Chrome có chính sách CORS nghiêm ngặt. Khi sử dụng canvas để chỉnh sửa ảnh thủ công, backend đã cấu hình bypass CORS thành công. Tuy nhiên, hãy đảm bảo luôn khởi chạy Frontend bằng `localhost` thay vì `127.0.0.1`.
2. **Kiểm tra trạng thái Server:**
   * Ở phía góc trên bên phải màn hình Drobe, có một dấu chấm tròn chỉ thị trạng thái **Live**. Nếu màu xanh lá cây nghĩa là Frontend đã kết nối thành công với Backend. Nếu màu đỏ nghĩa là Backend đang tắt hoặc bị chặn cổng `3000`.
