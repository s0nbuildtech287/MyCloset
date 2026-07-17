#!/bin/sh

# Thiết lập thư mục lưu trữ Model AI rembg cố định
export U2NET_HOME=/app/.u2net
mkdir -p /app/.u2net

# Tải trước model u2net tại runtime bằng curl (nếu chưa có)
# rembg sẽ dùng file này khi được gọi qua subprocess, không cần HTTP server nữa
if [ ! -f /app/.u2net/u2net.onnx ]; then
  echo "Downloading rembg u2net model from GitHub Releases..."
  # Tải vào file tạm .tmp trước
  curl -L -o /app/.u2net/u2net.onnx.tmp https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx
  # Chỉ đổi tên khi tải thành công trọn vẹn
  if [ $? -eq 0 ] && [ -f /app/.u2net/u2net.onnx.tmp ]; then
    mv /app/.u2net/u2net.onnx.tmp /app/.u2net/u2net.onnx
    echo "Model downloaded successfully!"
  else
    echo "Error: Failed to download model."
    rm -f /app/.u2net/u2net.onnx.tmp
  fi
fi

# Đồng bộ schema Database Prisma (tự động đẩy migrations lên Supabase DB)
echo "Running Prisma DB Push..."
cd /app/backend
npx prisma db push --accept-data-loss

# Khởi chạy Node Express Backend
echo "Starting Node.js Backend Server on port 3000..."
npm run start
