#!/bin/sh

# Thiết lập thư mục lưu trữ Model AI rembg cố định
export U2NET_HOME=/app/.u2net

# Khởi chạy rembg server ở background trên port 5000
echo "Starting rembg background service on port 5000..."
rembg s --host 127.0.0.1 --port 5000 &

# Chờ 3 giây để rembg server khởi động hoàn tất
sleep 3

# Đồng bộ schema Database Prisma (tự động đẩy migrations lên Supabase DB)
echo "Running Prisma DB Push..."
cd /app/backend
npx prisma db push --accept-data-loss

# Khởi chạy Node Express Backend
echo "Starting Node.js Backend Server on port 3000..."
npm run start
