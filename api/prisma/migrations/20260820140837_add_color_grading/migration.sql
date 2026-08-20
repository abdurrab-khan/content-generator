-- CreateEnum
CREATE TYPE "RenderState" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "color_grading_presets" (
    "preset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filter_graph" TEXT NOT NULL,
    "is_built_in" BOOLEAN NOT NULL DEFAULT true,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "color_grading_presets_pkey" PRIMARY KEY ("preset_id")
);

-- CreateTable
CREATE TABLE "clip_renders" (
    "render_id" TEXT NOT NULL,
    "state" "RenderState" NOT NULL DEFAULT 'PENDING',
    "output_path" TEXT,
    "error_message" TEXT,
    "color_grading_preset_id" TEXT,
    "variant_key" TEXT NOT NULL,
    "options" JSONB,
    "clip_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_renders_pkey" PRIMARY KEY ("render_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "color_grading_presets_name_key" ON "color_grading_presets"("name");

-- CreateIndex
CREATE INDEX "clip_renders_clip_id_idx" ON "clip_renders"("clip_id");

-- CreateIndex
CREATE UNIQUE INDEX "clip_renders_clip_id_variant_key_key" ON "clip_renders"("clip_id", "variant_key");

-- AddForeignKey
ALTER TABLE "clip_renders" ADD CONSTRAINT "clip_renders_color_grading_preset_id_fkey" FOREIGN KEY ("color_grading_preset_id") REFERENCES "color_grading_presets"("preset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_renders" ADD CONSTRAINT "clip_renders_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("clip_id") ON DELETE CASCADE ON UPDATE CASCADE;
