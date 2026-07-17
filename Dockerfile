# Sử dụng base image tích hợp sẵn cả Node.js 22 và Python 3.11 trên nền Debian Slim
FROM nikolaik/python-nodejs:python3.11-nodejs22-slim
USER root

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các gói hệ thống cần thiết (cho onnxruntime/sharp nếu cần compile, và libgl/glib cho OpenCV trong rembg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục lưu trữ Model AI rembg cố định
ENV U2NET_HOME=/app/.u2net

# Cài đặt rembg — gọi trực tiếp qua subprocess từ Node.js, không cần HTTP server
RUN pip install --no-cache-dir rembg

# Tải trước model u2net trong quá trình build để tránh lỗi mạng lúc runtime (Đã chuyển sang start.sh)

# Copy package.json và lock files để cài đặt Node dependencies
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Cài đặt node dependencies cho toàn bộ workspace monorepo
RUN npm ci --include=dev

# Copy mã nguồn dự án (cho shared và backend)
COPY shared/ ./shared/
COPY backend/ ./backend/

# Chạy build prisma client và tsc biên dịch TypeScript cho backend
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# Quay lại thư mục làm việc chính
WORKDIR /app

# Copy kịch bản khởi chạy đồng thời cả python rembg server và Node express
COPY start.sh ./
RUN chmod +x start.sh

# Expose cổng của Express Backend (Render tự cấu hình nhận cổng PORT)
EXPOSE 3000

# Khởi chạy ứng dụng bằng start.sh
CMD ["./start.sh"]
