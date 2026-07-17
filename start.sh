#!/bin/sh

# Thiết lập thư mục lưu trữ Model AI rembg cố định
export U2NET_HOME=/app/.u2net
mkdir -p /app/.u2net

# Tải trước model u2net tại runtime bằng curl (nếu chưa có)
if [ ! -f /app/.u2net/u2net.onnx ]; then
  echo "Downloading rembg u2net model from GitHub Releases..."
  curl -L -o /app/.u2net/u2net.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx
fi

# Khởi chạy rembg server ở background trên port 5000
echo "Starting rembg background service on port 5000..."
rembg s --host 127.0.0.1 --port 5000 &

# Chờ 5 giây để rembg server khởi động hoàn tất
sleep 5

# Đồng bộ schema Database Prisma (tự động đẩy migrations lên Supabase DB)
echo "Running Prisma DB Push..."
cd /app/backend
npx prisma db push --accept-data-loss

# Khởi chạy Node Express Backend
echo "Starting Node.js Backend Server on port 3000..."
npm run start
