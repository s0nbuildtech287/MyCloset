-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(100),
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "color" VARCHAR(50),
    "brand" VARCHAR(100),
    "season" VARCHAR(20),
    "tags" TEXT[],
    "original_image_url" TEXT NOT NULL,
    "processed_image_url" TEXT,
    "processing_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "purchase_url" TEXT,
    "price" DECIMAL(12,2),
    "purchased_at" DATE,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "clothing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150),
    "thumbnail_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_items" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "clothing_item_id" UUID NOT NULL,
    "position_x" DOUBLE PRECISION NOT NULL,
    "position_y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "z_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "clothing_items" ADD CONSTRAINT "clothing_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
