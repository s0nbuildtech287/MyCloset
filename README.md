# Drobe — Closet Management Web Application

Drobe là ứng dụng web giúp quản lý tủ quần áo cá nhân trực quan bằng cách: lưu trữ thông tin quần áo kèm ảnh sạch (tự động tách nền qua AI chạy local), và phối đồ trực quan trên canvas kéo-thả.

## Cấu Trúc Dự Án (Monorepo)

Dự án được cấu trúc dưới dạng monorepo sử dụng npm workspaces:
- `/frontend`: Ứng dụng client React 18 + Vite + Tailwind CSS.
- `/backend`: API server Express + TypeScript + Prisma ORM + PostgreSQL.
- `/shared`: Chứa định nghĩa kiểu dữ liệu dùng chung (Types) cho cả client và server.

---

## Hướng Dẫn Chạy Local

### 1. Yêu Cầu Hệ Thống
- **Node.js**: Phiên bản 18+ (khuyên dùng v20).
- **PostgreSQL**: Đã được cài đặt và đang chạy local (mặc định cấu hình dùng DB tên `mycloset`).
- **Python**: Đã cài đặt Python 3.9+ (để cài đặt công cụ tách nền `rembg`).

### 2. Thiết Lập Database (PostgreSQL)
1. Đảm bảo bạn đã khởi tạo một database có tên `mycloset` trong PostgreSQL (qua pgAdmin hoặc DBeaver).
2. Kiểm tra/điều chỉnh chuỗi kết nối database trong file `/backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:123456@localhost:5432/mycloset?schema=public"
   PORT=3000
   JWT_ACCESS_SECRET="drobe_access_secret_key_12345!@#$"
   JWT_REFRESH_SECRET="drobe_refresh_secret_key_67890!@#$"
   ```
3. Ở thư mục gốc dự án, cài đặt các dependencies và chạy migration để đồng bộ các bảng cơ sở dữ liệu:
   ```bash
   # Cài đặt dependencies toàn monorepo
   npm install

   # Tạo các bảng cơ sở dữ liệu trong PostgreSQL
   npm run build --workspace=backend
   npx prisma migrate dev --name init --schema=backend/prisma/schema.prisma
   ```

### 3. Thiết Lập Công Cụ Tách Nền (Rembg Service) - *Cho Phase 3*
Công cụ tách nền sẽ chạy dưới dạng một tiến trình Python độc lập đóng vai trò REST API:
1. Tạo một thư mục Python Virtual Environment ở thư mục gốc:
   ```bash
   python -m venv venv
   # Kích hoạt venv (trên Windows PowerShell):
   .\venv\Scripts\Activate.ps1
   ```
2. Cài đặt thư viện `rembg`:
   ```bash
   pip install "rembg[cli]"
   ```
3. Khởi động server tách nền (chạy cổng 5000):
   ```bash
   rembg s --host 0.0.0.0 --port 5000
   ```
   *(Lưu ý: Trong lần tách ảnh đầu tiên, server sẽ tự động tải model AI `u2net` hoặc `u2net_cloth_seg` khoảng 100-300MB, sẽ mất khoảng vài chục giây).*

### 4. Chạy Ứng Dụng Dev
Chỉ cần chạy một lệnh duy nhất từ thư mục gốc, hệ thống sẽ tự động khởi chạy song song cả client (port 5173) và backend (port 3000):
```bash
npm run dev
```

- **Frontend client**: Truy cập `http://localhost:5173`
- **Backend API**: Truy cập `http://localhost:3000/api/health` để kiểm tra trạng thái hoạt động.

---

## Luồng Hoạt Động Của Authentication (JWT + HTTP-Only Cookie)
1. **Đăng nhập / Đăng ký**: Gửi email và mật khẩu lên backend `/api/auth/login` hoặc `/api/auth/register`.
2. **Access Token**: Trả về trực tiếp trong response dạng JSON và lưu vào memory của ứng dụng client (qua Zustand store) với hạn dùng ngắn (15 phút). Dùng để đính kèm vào header `Authorization: Bearer <token>` khi gọi API.
3. **Refresh Token**: Được backend ký và trả về dạng Cookie với cờ `httpOnly` và thời hạn dài (7 ngày). Trình duyệt sẽ tự động lưu và gửi kèm cookie này khi gọi route `/api/auth/refresh`.
4. **Tự Động Làm Mới (Silent Refresh)**: Khi access token hết hạn (lỗi 401), Axios Interceptor ở phía frontend sẽ tự động chặn, gọi ngầm API `/api/auth/refresh` bằng refresh token cookie để lấy access token mới, rồi tiếp tục gửi lại request cũ một cách hoàn toàn tự động và trong suốt với trải nghiệm người dùng.
