# Drobe — Project Plan

> Web app quản lý tủ quần áo cá nhân: CRUD đồ, tự động remove background khi upload, ghép outfit bằng canvas kéo-thả.

---

## 1. Mục tiêu & Phạm vi

- Web app (SPA), không phải mobile native. Responsive tốt để dùng được trên điện thoại (PWA-ready sau này nếu cần).
- User đăng nhập → quản lý tủ đồ cá nhân (private, không phải multi-tenant phức tạp).
- Core value: (1) lưu trữ quần áo đã mua kèm ảnh đẹp (auto remove bg), (2) ghép thử outfit trực quan.
- KHÔNG cần: virtual try-on AI trên người mẫu, không cần social/share công khai (trừ khi bổ sung sau).

---

## 2. Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS + shadcn/ui + Zustand (state) + react-konva (canvas ghép đồ)
- **Backend**: Node.js + Express + PostgreSQL
- **Background removal service**: dùng thẳng REST API server built-in của [rembg](https://github.com/danielgatis/rembg), chạy trực tiếp bằng CLI (`pip install "rembg[cli]"` → `rembg s --host 0.0.0.0 --port 5000`) — KHÔNG dùng Docker, chạy local như 1 process Python bình thường lúc dev. Model dùng `isnet-general-use` hoặc `u2net_cloth_seg` (train riêng cho clothes segmentation) thay vì model mặc định `u2net`. Fallback API Clipdrop/remove.bg cho ảnh khó
- **Storage**: giai đoạn local dev — lưu ảnh trực tiếp vào thư mục local (VD `/backend/uploads`), serve qua static route Express. Chuyển sang Cloudflare R2/GCS khi tính tới deploy
- **Auth**: JWT access token (ngắn hạn, ~15 phút) + refresh token lưu httpOnly cookie (KHÔNG lưu JWT trong localStorage)
- **Deploy**: chưa cần tính lúc này, tập trung chạy local trước. Sẽ quyết định hạ tầng khi làm xong core features

---

## 3. Data Model (PostgreSQL)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear'
  color VARCHAR(50),
  brand VARCHAR(100),
  season VARCHAR(20), -- 'spring' | 'summer' | 'fall' | 'winter' | 'all'
  tags TEXT[],
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT, -- ảnh đã remove background, NULL khi đang xử lý
  processing_status VARCHAR(20) DEFAULT 'pending', -- pending | processing | done | failed
  purchase_url TEXT,
  price NUMERIC(12,2),
  purchased_at DATE,
  is_favorite BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150),
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE outfit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
  clothing_item_id UUID REFERENCES clothing_items(id) ON DELETE CASCADE,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  scale FLOAT DEFAULT 1,
  rotation FLOAT DEFAULT 0,
  z_index INT DEFAULT 0
);

CREATE INDEX idx_clothing_items_user ON clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON clothing_items(category);
CREATE INDEX idx_outfits_user ON outfits(user_id);
```

---

## 4. API Endpoints

### Auth
- `POST /api/auth/register` — {email, password, name}
- `POST /api/auth/login` — {email, password} → access token + set refresh cookie
- `POST /api/auth/refresh` — dùng refresh cookie → access token mới
- `POST /api/auth/logout`

### Clothing Items
- `GET /api/items?category=&tag=&search=&page=` — list, filter, phân trang
- `GET /api/items/:id`
- `POST /api/items` — multipart upload ảnh + metadata → tạo record `processing_status=pending`, trigger job remove bg
- `PATCH /api/items/:id` — sửa metadata
- `DELETE /api/items/:id`
- `GET /api/items/:id/status` — poll trạng thái xử lý ảnh (hoặc dùng Socket.IO để push realtime, đã quen dùng ở đồ án thesis)

### Outfits
- `GET /api/outfits`
- `GET /api/outfits/:id`
- `POST /api/outfits` — {name, items: [{clothing_item_id, position_x, position_y, scale, rotation, z_index}], thumbnail_base64}
- `PATCH /api/outfits/:id`
- `DELETE /api/outfits/:id`

### Background Removal Service (nội bộ, không expose public)
- `POST /internal/remove-bg` — nhận ảnh, trả PNG nền trong suốt (rembg), backend Node gọi service này qua HTTP nội bộ

---

## 5. Luồng xử lý ảnh (quan trọng, làm đúng ngay từ đầu)

1. User upload ảnh → Node lưu ảnh gốc vào storage, tạo record DB `processing_status=pending`, trả response ngay (không block user)
2. Node gọi async job (hàng đợi trong bộ nhớ - In-memory queue như fastq hoặc Event Emitter để tránh phụ thuộc Redis lúc dev) → gửi POST multipart/form-data chứa file ảnh tới server rembg local qua CLI `http://localhost:5000` (được gọi từ Node, tham số gửi lên mặc định là `file`)
3. rembg xử lý → trả PNG nền trong suốt → Node lưu vào storage, update `processed_image_url`, `processing_status=done`
4. Nếu rembg lỗi hoặc kết quả tệ (edge case) → fallback gọi Clipdrop/remove.bg API
5. Frontend: hiển thị skeleton/placeholder ảnh khi `processing_status != done`, tự refresh khi xong (poll hoặc Socket.IO)

---

## 6. UI/UX Design Direction — YÊU CẦU: đẹp, chuyên nghiệp, không dùng UI mặc định

**Nguyên tắc chung**: đây là app thời trang cá nhân, phải có cảm giác như 1 sản phẩm SaaS/thương mại thật (kiểu Whering, Indyx, các fashion-tech app), TUYỆT ĐỐI tránh giao diện "admin dashboard" khô cứng (bảng biểu, border xám, spacing chật) — ảnh quần áo là nhân vật chính, mọi thứ khác phục vụ cho ảnh.

- **Bảng màu**: nền be/kem ấm (#FAF6F1) hoặc trắng ngà, accent terracotta (#C4704F) hoặc sage green (#8A9A5B), text đen ấm (#2A2521) thay vì đen thuần. Tránh xanh dương công sở/tím mặc định của template.
- **Typography**: Inter hoặc Manrope cho body, có thể dùng 1 serif font (VD: "Fraunces" hoặc "Playfair Display") cho heading lớn để tạo chất "tạp chí thời trang" — kết hợp serif + sans tạo điểm nhấn chuyên nghiệp, không dùng 1 font suốt cho mọi cấp độ.
- **Spacing**: rộng rãi, nhiều white space, không nhồi nhét — card ảnh có margin thoáng, padding lớn hơn mặc định của component library.
- **Trang chính (Tủ đồ)**: grid ảnh lớn kiểu Pinterest/Instagram (masonry hoặc grid đều tùy), category filter dạng pill tabs bo tròn đầy đủ, search bar tối giản (icon + placeholder nhạt) phía trên, không dùng sidebar nặng nề.
- **Micro-interactions**: hover ảnh scale nhẹ (1.02-1.03) + shadow nhẹ nổi lên, transition mượt (200-300ms ease) khi filter/chuyển tab, skeleton loading dạng shimmer (không phải spinner tròn nhàm chán) khi ảnh đang xử lý remove bg.
- **Outfit Builder**: canvas nền trắng/xám nhạt (#F5F5F3), lưới căn chỉnh mờ (dotted grid), item PNG có shadow đổ nhẹ để tạo chiều sâu, sidebar chọn đồ dạng thumbnail nhỏ có tìm kiếm nhanh, toolbar nổi (floating) thay vì cố định cứng.
- **Trang chi tiết item**: layout 2 cột — ảnh lớn chiếm ~60% bên trái (có thể zoom khi hover), metadata dạng label nhẹ nhàng bên phải, nút hành động (sửa/xóa) dùng icon button tinh tế thay vì button to màu mè.
- **Component library**: dùng shadcn/ui làm nền nhưng PHẢI customize theme (border-radius, shadow, color tokens) — không để mặc định trông giống mọi app shadcn khác trên mạng.
- **Empty states**: khi tủ đồ trống, không hiện chữ "No data" khô khan — dùng illustration nhẹ nhàng + câu gợi ý thân thiện ("Tủ đồ đang trống, thêm món đầu tiên nào!").

---

## 7. Cấu trúc thư mục — Monorepo (1 repo chung, không tách frontend/backend)

Lý do dùng monorepo: solo dev, dễ quản lý, không lo lệch API contract giữa FE/BE, hợp khi feed cho coding agent làm việc (agent thấy full context trong 1 repo). Không dùng Docker ở giai đoạn này — chạy trực tiếp bằng npm/pnpm + Python venv cho rembg.

```
drobe/
  /frontend
    /src
      /components (ui/, wardrobe/, outfit-builder/)
      /pages (Login, Wardrobe, ItemDetail, OutfitBuilder, MyOutfits)
      /store (zustand stores)
      /api (axios client, endpoints)
    package.json
    vite.config.ts
  /backend
    /src
      /routes (auth.js, items.js, outfits.js)
      /controllers
      /models
      /middleware (auth.js, upload.js)
      /services (imageProcessing.js — gọi rembg REST server local)
    /uploads (lưu ảnh local khi dev, .gitignore)
    package.json
  /shared
    /types (TypeScript interfaces dùng chung FE/BE: ClothingItem, Outfit...)
  package.json (root — nếu dùng npm/pnpm workspaces)
  README.md (hướng dẫn chạy local: start Postgres, start rembg server, start backend, start frontend)
```

**Chạy local (không Docker)**: cần 3 process chạy song song lúc dev — PostgreSQL (cài local hoặc dùng service có sẵn máy), `rembg s` (Python venv riêng), và `npm run dev` cho cả backend lẫn frontend (2 terminal hoặc dùng `concurrently`).

---

## 8. Roadmap theo phase (checklist cho agent thực hiện tuần tự)

### Phase 1 — Setup nền tảng
- [x] Init monorepo (`/frontend`, `/backend`, `/shared`), root package.json nếu dùng workspaces
- [x] Setup frontend (Vite + React 18 + Tailwind + shadcn/ui)
- [x] Cấu hình Vite Proxy ở frontend chuyển tiếp `/api` sang backend port 3000 để tránh lỗi CORS và share cookie dễ dàng
- [x] Setup backend (Express + PostgreSQL connection local + migration tool, VD Knex hoặc Prisma)
- [x] Setup schema DB theo mục 3 (PostgreSQL cài/chạy local, chưa cần cloud)
- [x] Auth: register/login/refresh/logout, JWT + httpOnly cookie refresh token
- [x] Middleware xác thực route
- [x] Viết README hướng dẫn chạy local (start Postgres, start rembg, start backend, start frontend)

### Phase 2 — CRUD tủ đồ (chưa cần remove bg)
- [x] API upload ảnh (lưu ảnh gốc trực tiếp, chưa xử lý)
- [x] API CRUD clothing_items đầy đủ
- [x] Frontend: trang Wardrobe (grid), form thêm/sửa item, filter theo category/tag

### Phase 3 — Remove background
- [x] Cài rembg local (Python venv riêng), chạy `rembg s` local trên port 5000
- [x] Chọn model phù hợp clothes segmentation (`isnet-general-use` hoặc `u2net_cloth_seg`)
- [x] Kết nối backend Node → gọi `POST http://localhost:5000/` (hoặc endpoint tương ứng của rembg) khi upload ảnh mới (Lưu ý: set timeout cho request đầu tiên dài hơn vì rembg cần tự tải model lúc mới chạy lần đầu)
- [x] Xử lý trạng thái processing_status + hiển thị loading state ở frontend
- [x] Fallback API cho ảnh xử lý lỗi/kém

### Phase 4 — Outfit Builder
- [x] Component canvas react-konva: kéo-thả, resize, xoay, layer order
- [x] API lưu/đọc outfit + outfit_items
- [x] Export thumbnail từ canvas khi lưu outfit
- [x] Trang "My Outfits" xem lại danh sách

### Phase 5 — Polish
- [x] Responsive mobile
- [x] Dashboard thống kê cơ bản (tổng số món, tổng tiền, theo category)
- [x] Empty states, error handling, loading skeletons đồng bộ toàn app

### Phase 6 — Deploy (CHƯA LÀM VỘI — chỉ tính đến khi Phase 1-5 chạy ổn định local)
- [ ] Quyết định hạ tầng (VM/Railway/Render cho backend, Vercel/Cloudflare Pages cho frontend, storage cloud cho ảnh)
- [ ] Đóng gói rembg (lúc này mới cân nhắc Docker nếu cần)
- [ ] Setup domain + SSL
- [ ] Test end-to-end luồng chính

---

## 9. Lưu ý bảo mật / kỹ thuật cần tuân thủ

- JWT access token KHÔNG lưu localStorage — dùng memory (Zustand/context) + refresh qua httpOnly cookie
- Validate file upload (chỉ ảnh, giới hạn size, kiểm tra mimetype thật chứ không chỉ đuôi file)
- Rate limit endpoint upload để tránh spam gọi rembg/API tốn tiền
- Ảnh lưu storage nên có naming theo user_id/uuid để tránh đoán URL