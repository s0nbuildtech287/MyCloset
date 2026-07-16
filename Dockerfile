# Sử dụng base image tích hợp sẵn cả Node.js 20 và Python 3.11 trên nền Debian Slim
FROM nikolaik/python-nodejs:python3.11-nodejs20-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các gói hệ thống cần thiết (cho onnxruntime/sharp nếu cần compile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt rembg và các thư viện python đi kèm vào môi trường global của container
RUN pip install --no-cache-dir rembg fastapi uvicorn python-multipart

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
