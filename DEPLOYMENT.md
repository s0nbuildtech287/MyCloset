# 🌐 HƯỚNG DẪN TRIỂN KHAI & KIẾN TRÚC HỆ THỐNG DROBE MYCLOSET

Tài liệu này giải thích chi tiết kiến trúc hệ thống, lý do lựa chọn các dịch vụ triển khai (deploy), và cách vận hành dự án **Drobe MyCloset** trên môi trường online.

---

## 🛠️ 1. Sơ đồ Kiến trúc Hệ thống (System Architecture)

Dự án là một ứng dụng Monorepo (chứa cả Frontend và Backend trong cùng một thư mục). Khi chạy online, các thành phần sẽ được phân bổ như sau:

```
[📱 Người dùng (Điện thoại/PC)] 
       │
       ▼ (Truy cập giao diện)
[🎨 Giao diện Frontend (Vercel)] 
       │
       ▼ (Gửi các yêu cầu API HTTP/HTTPS)
[⚙️ Máy chủ ảo Backend (Render Docker)] ─── (Cổng local 5000) ───► [🐍 Dịch vụ xóa phông (rembg Python)]
       │
       ▼ (Đọc/Ghi dữ liệu & File ảnh)
[🗄️ Database & Storage (Supabase Cloud)]
```

---

## 🚀 2. Tại sao lại lựa chọn các dịch vụ này?

### A. Database & Storage: **Supabase**
* **Nhiệm vụ:** Lưu trữ dữ liệu PostgreSQL và file ảnh quần áo (Supabase Storage).
* **Lý do chọn:** 
  * Dữ liệu chạy trực tiếp trên đám mây (Cloud), giúp ứng dụng không bị mất dữ liệu khi tắt máy tính.
  * Hỗ trợ lưu trữ file tĩnh (Storage bucket) với băng thông tải ảnh cực nhanh và có SSL bảo mật.

### B. Giao diện Frontend: **Vercel**
* **Nhiệm vụ:** Biên dịch và hiển thị giao diện React/Vite cho người dùng.
* **Lý do chọn:**
  * Tốc độ tải trang cực nhanh nhờ hạ tầng CDN phân tán toàn cầu.
  * Miễn phí hoàn toàn cho các dự án cá nhân.
  * Tự động build và deploy lại ngay lập tức khi phát hiện code mới được đẩy (push) lên GitHub.

### C. Máy chủ API Backend: **Render** (sử dụng Docker Web Service)
* **Nhiệm vụ:** Chạy máy chủ API Node.js/Express, kết nối database và chạy dịch vụ tách nền ảnh ngầm bằng Python (`rembg`).
* **Lý do chọn:**
  * Dịch vụ tách nền quần áo `rembg` chạy bằng Python và cần tải thư viện máy học ONNX nặng hơn 100MB. Các nền tảng serverless như Vercel **không hỗ trợ** chạy tiến trình Python nặng và lâu dài.
  * Render hỗ trợ **Docker**, cho phép chúng ta tự đóng gói một môi trường ảo hóa chứa cả Node.js và Python để chạy song song 24/7 mà không lo bị quá thời gian xử lý (timeout).

---

## ⚙️ 3. Các thiết lập quan trọng đã thực hiện trong mã nguồn

### 1️⃣ Máy ảo hóa [Dockerfile](file:///c:/Users/XUAN%20SON/Desktop/MyCloset/Dockerfile)
* **Node.js v22:** Thư viện `@supabase/supabase-js` bản mới nhất yêu cầu đối tượng `WebSocket` mặc định của hệ thống. Node.js 20 trở xuống không có sẵn cái này nên sẽ bị crash. Dockerfile đã nâng cấp lên Node.js 22 để sửa lỗi này.
* **Python + rembg:** Cài đặt sẵn môi trường Python và thư viện `rembg` từ bước build ảnh đĩa, giúp máy chủ khởi động tức thì khi container chạy.

### 2️⃣ Kịch bản khởi động [start.sh](file:///c:/Users/XUAN%20SON/Desktop/MyCloset/start.sh)
Khi máy chủ Render khởi chạy máy ảo, kịch bản này sẽ tự động:
1. Bật dịch vụ Python `rembg` chạy ngầm ở cổng local `5000` của container.
2. Kiểm tra và cập nhật bảng dữ liệu PostgreSQL trên Supabase (`npx prisma db push`).
3. Khởi động server chính Node.js Express ở cổng `3000`.

### 3️⃣ Thông hành CORS trong [backend/src/server.ts](file:///c:/Users/XUAN%20SON/Desktop/MyCloset/backend/src/server.ts)
* Trình duyệt có cơ chế bảo mật ngăn chặn trang web `vercel.app` gửi yêu cầu gọi dữ liệu tới server `onrender.com`.
* Code backend đã được cấu hình động để chấp nhận kết nối an toàn từ tên miền Frontend Vercel của anh thông qua biến môi trường `FRONTEND_URL`.

### 4️⃣ Động hóa API URL trong [frontend/src/api/client.ts](file:///c:/Users/XUAN%20SON/Desktop/MyCloset/frontend/src/api/client.ts)
* Tự động phát hiện môi trường:
  * Khi chạy local, client sử dụng relative path `/api` để đi qua proxy của Vite dev server.
  * Khi chạy online trên Vercel, client sẽ tự động đọc biến môi trường `VITE_API_URL` để gửi thẳng yêu cầu tới máy chủ Render.

---

## 📝 4. Hướng dẫn từng bước triển khai chi tiết

### Bước 1: Đẩy mã nguồn lên GitHub
1. Mở terminal tại thư mục gốc dự án `MyCloset`.
2. Chạy lệnh commit và push code lên GitHub:
   ```bash
   git add .
   git commit -m "Configure deployment settings"
   git push origin main
   ```

### Bước 2: Triển khai Backend lên Render (Docker)
1. Đăng nhập [Render.com](https://render.com/), chọn **New +** -> **Web Service**.
2. Chọn repo `MyCloset` của anh.
3. Cấu hình thông tin:
   * **Name:** `my-closet-backend` (hoặc tùy chọn).
   * **Region:** `Singapore (Southeast Asia)` để kết nối về Việt Nam nhanh nhất.
   * **Language:** Chọn **Docker** (Render sẽ tự động đọc file `Dockerfile` ở thư mục gốc).
   * **Instance Type:** Chọn **Free**.
4. Thêm các biến môi trường tại mục **Environment Variables** (copy các biến từ file `backend/.env` hiện tại của anh):
   * `DATABASE_URL` = link kết nối Supabase DB.
   * `DIRECT_URL` = link kết nối trực tiếp Supabase DB.
   * `OPENAI_API_KEY` = khóa API OpenAI của anh.
   * `OPENAI_MODEL` = `gpt-4o`
   * `SUPABASE_URL` = link Supabase URL của anh.
   * `SUPABASE_SERVICE_ROLE_KEY` = khóa service role Supabase.
   * `JWT_ACCESS_SECRET` = chuỗi bí mật bất kỳ.
   * `JWT_REFRESH_SECRET` = chuỗi bí mật bất kỳ.
5. Bấm **Deploy Web Service** và đợi khoảng 8-12 phút để hệ thống build Docker xong. Copy lại URL của backend sau khi chạy xong (ví dụ: `https://mycloset-68gr.onrender.com`).

### Bước 3: Triển khai Frontend lên Vercel
1. Đăng nhập [Vercel.com](https://vercel.com/), chọn **Add New...** -> **Project**.
2. Chọn repo `MyCloset` của anh.
3. Cấu hình thông tin dự án:
   * **Framework Preset:** Chọn **Vite**.
   * **Root Directory:** Bấm **Edit** và chọn thư mục **`frontend`** (Rất quan trọng).
   * Các mục khác giữ nguyên mặc định.
4. Thêm biến môi trường tại mục **Environment Variables**:
   * **Key:** `VITE_API_URL`
   * **Value:** Dán địa chỉ URL Backend Render anh vừa copy ở Bước 2 (ví dụ: `https://mycloset-68gr.onrender.com` - *không ghi dấu gạch chéo `/` ở cuối*).
5. Bấm **Deploy** và chờ 1-2 phút. Lưu lại URL trang web Vercel cấp cho anh (ví dụ: `https://my-closet-frontend.vercel.app`).

### Bước 4: Đồng bộ CORS trên Render
1. Quay lại trang cấu hình Web Service của anh trên **Render**.
2. Chọn mục **Settings** -> Tìm đến phần **Environment Variables**.
3. Thêm một biến môi trường mới:
   * **Key:** `FRONTEND_URL`
   * **Value:** Dán URL trang web Vercel của anh vừa tạo ở Bước 3 (ví dụ: `https://my-closet-frontend.vercel.app`).
4. Bấm **Save Changes** để Render lưu và khởi động lại server.

**Chúc mừng anh! Hệ thống của anh hiện tại đã hoạt động online hoàn chỉnh và có thể truy cập mượt mà trên mọi thiết bị di động!**
