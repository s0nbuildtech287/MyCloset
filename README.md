# 👗 Drobe — Ứng Dụng Quản Lý Tủ Đồ Cá Nhân Thông Minh

Drobe là ứng dụng Web giúp bạn số hóa và quản lý tủ quần áo của mình một cách trực quan, khoa học. Với Drobe, bạn có thể lưu trữ thông tin trang phục, tự động tách nền ảnh bằng AI chạy offline (local), và tự tay phối đồ trên một canvas kéo-thả vô cùng sinh động.

---

## ✨ Các Tính Năng Nổi Bật

* Quản lý tủ đồ trực quan: Lưu trữ hình ảnh quần áo, phân loại (Áo, Quần, Giày dép, Phụ kiện, Áo khoác) kèm thông tin về màu sắc, thương hiệu, tình trạng và mùa sử dụng.
* Tách nền thông minh (AI Background Remover): Tách sạch nền ảnh quần áo tự động bằng mô hình AI chạy trực tiếp ngay trên máy tính của bạn (không tốn phí API).
* Canvas phối đồ tự do: Tự do kéo thả, phóng to, thu nhỏ, xoay và sắp xếp các món đồ để tạo ra những bộ cánh (Outfits) phong cách nhất.
* Lên kế hoạch xếp đồ du lịch (Travel Planner): Lập danh sách đồ cần chuẩn bị cho các chuyến đi và đánh dấu những món đã xếp vào vali.
* Nhật ký phối đồ (Outfit Diary): Lưu lại lịch sử trang phục bạn đã mặc theo từng ngày trên giao diện lịch trực quan.
* Chế độ Ngoại tuyến / Giả lập (Bypass Mode): Cho phép đăng nhập nhanh không cần kết nối Server Backend để xem thử giao diện tủ đồ mẫu.

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy Local

### 1. Yêu Cầu Hệ Thống
Trước khi chạy, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
* Node.js: Phiên bản 18 trở lên (Khuyên dùng v20+).
* PostgreSQL: Đã được cài đặt và đang chạy local (Cổng mặc định 5432).
* Python: Phiên bản 3.9 - 3.11 (để chạy server tách nền AI rembg nếu cần).

---

### 2. Các Bước Khởi Chạy Nhanh

#### Bước 1: Cài đặt thư viện
Mở terminal tại thư mục gốc của dự án (MyCloset) và chạy lệnh sau để tự động cài đặt tất cả thư viện cho Frontend và Backend:
```bash
npm install
```

#### Bước 2: Cấu hình Cơ sở dữ liệu (PostgreSQL Local)
1. Mở phần mềm quản lý database của bạn (như pgAdmin, DBeaver) và tạo một database mới tên là:
   ```sql
   CREATE DATABASE mycloset;
   ```
2. Mở file cấu hình kết nối database tại đường dẫn [backend/.env](file:///C:/Users/XUAN%20SON/Desktop/Xuan%20Son%20Version/MyCloset/backend/.env).
3. Đảm bảo cấu hình đang trỏ về PostgreSQL local của bạn. Ví dụ:
   ```env
   DATABASE_URL="postgresql://postgres:123456@localhost:5432/mycloset?schema=public"
   DIRECT_URL="postgresql://postgres:123456@localhost:5432/mycloset?schema=public"
   ```
   *(Hãy thay thế postgres bằng tên đăng nhập và 123456 bằng mật khẩu PostgreSQL trên máy của bạn).*

4. Đồng bộ cấu hình bảng dữ liệu bằng lệnh:
   ```bash
   npx prisma db push --schema=backend/prisma/schema.prisma
   ```

#### Bước 3: Chạy ứng dụng web
Khởi chạy đồng thời cả Frontend và Backend chỉ bằng một lệnh duy nhất:
```bash
npm run dev
```
* Giao diện người dùng (Vite + React): Truy cập http://localhost:5173 (hoặc http://localhost:5174 nếu cổng 5173 bị trùng).
* Máy chủ API (Node.js + Express): Chạy tại cổng http://localhost:3000.

---

### 3. Thiết Lập Công Cụ Tách Nền AI (Tùy chọn)

Nếu bạn muốn sử dụng tính năng tự động xóa phông ảnh khi tải quần áo lên:
1. Mở một cửa sổ Terminal mới tại thư mục gốc dự án và tạo môi trường ảo Python:
   ```bash
   python -m venv venv
   ```
2. Kích hoạt môi trường ảo:
   * Trên Windows (PowerShell): .\venv\Scripts\Activate.ps1
   * Trên Windows (CMD): .\venv\Scripts\activate.bat
   * Trên macOS/Linux: source venv/bin/activate
3. Cài đặt thư viện tách nền:
   ```bash
   pip install rembg
   ```
4. Khởi chạy Server AI tách nền ở cổng 5000:
   ```bash
   rembg s --host 0.0.0.0 --port 5000
   ```
*(Lần đầu tiên tách ảnh, ứng dụng sẽ tải tự động model AI u2net khoảng 170MB về máy mất khoảng vài chục giây, những lần sau sẽ chạy ngay lập tức).*

---

## 🔑 Tài Khoản Đăng Nhập & Chế Độ Bypass

Ứng dụng hỗ trợ cơ chế đăng nhập đặc biệt giúp bạn thử nghiệm nhanh chóng:
* Tài khoản dùng thử mặc định:
  * Email/Username: xu4ns0n hoặc xu4ns0n@drobe.com
  * Mật khẩu: Sondeptrai123@k
* Cơ chế hoạt động:
  * Chế độ Local (Có Backend): Khi đăng nhập bằng tài khoản này, hệ thống sẽ tự động tạo tài khoản trong database local và tự động nạp (seed) sẵn 10 sản phẩm quần áo & giày dép mẫu tuyệt đẹp để bạn trải nghiệm tính năng phối đồ ngay lập tức mà không cần tự tải ảnh lên.
  * Chế độ Bypass (Khi Backend tắt): Nếu server backend gặp sự cố hoặc bị tắt, giao diện frontend sẽ tự động kích hoạt Bypass Mode khi nhập đúng tài khoản này. Hệ thống sẽ cho phép bạn vào thẳng màn hình chính và tải sẵn 10 trang phục mẫu trên giao diện để xem thử và test giao diện bộ lọc.

---

## 📂 Cấu Trúc Dự Án (Monorepo)

Dự án sử dụng tính năng Workspaces của npm để quản lý mã nguồn tập trung:
* [frontend/](file:///C:/Users/XUAN%20SON/Desktop/Xuan%20Son%20Version/MyCloset/frontend) — Giao diện phía client (React, Vite, Tailwind CSS, Zustand).
* [backend/](file:///C:/Users/XUAN%20SON/Desktop/Xuan%20Son%20Version/MyCloset/backend) — Máy chủ xử lý API (Express, Prisma ORM, TypeScript).
* [shared/](file:///C:/Users/XUAN%20SON/Desktop/Xuan%20Son%20Version/MyCloset/shared) — Định nghĩa kiểu dữ liệu dùng chung (Types) cho cả client và server.
