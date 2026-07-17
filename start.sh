#!/bin/sh

# Thiết lập thư mục lưu trữ Model AI rembg cố định
export U2NET_HOME=/app/.u2net
mkdir -p /app/.u2net

MODEL_FILE="/app/.u2net/u2net.onnx"
NEED_DOWNLOAD=0

if [ ! -f "$MODEL_FILE" ]; then
  NEED_DOWNLOAD=1
else
  FILE_SIZE=$(wc -c < "$MODEL_FILE" 2>/dev/null || echo 0)
  if [ "$FILE_SIZE" -lt 150000000 ]; then
    NEED_DOWNLOAD=1
  fi
fi

if [ "$NEED_DOWNLOAD" -eq 1 ]; then
  echo "Model file is missing or incomplete. Downloading rembg u2net model..."
  rm -f "$MODEL_FILE"
  # Tải vào file tạm .tmp trước
  curl -L -o "$MODEL_FILE.tmp" https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx
  # Chỉ đổi tên khi tải thành công trọn vẹn
  if [ $? -eq 0 ] && [ -f "$MODEL_FILE.tmp" ]; then
    TMP_SIZE=$(wc -c < "$MODEL_FILE.tmp" 2>/dev/null || echo 0)
    if [ "$TMP_SIZE" -gt 150000000 ]; then
      mv "$MODEL_FILE.tmp" "$MODEL_FILE"
      echo "Model downloaded successfully!"
    else
      echo "Error: Downloaded file size is too small ($TMP_SIZE bytes)."
      rm -f "$MODEL_FILE.tmp"
    fi
  else
    echo "Error: Failed to download model."
    rm -f "$MODEL_FILE.tmp"
  fi
else
  echo "Model file is healthy."
fi

# Đồng bộ schema Database Prisma (tự động đẩy migrations lên Supabase DB)
echo "Running Prisma DB Push..."
cd /app/backend
npx prisma db push --accept-data-loss

# Khởi chạy Node Express Backend
echo "Starting Node.js Backend Server on port 3000..."
npm run start
