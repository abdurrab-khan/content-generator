-- CreateEnum
CREATE TYPE "PodcastLanguage" AS ENUM ('ENGLISH', 'HINDI');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('USED', 'NOT_INTERESTED');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "language" "PodcastLanguage" NOT NULL DEFAULT 'ENGLISH';

-- CreateTable
CREATE TABLE "discovered_podcasts" (
    "discovery_id" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL DEFAULT 'YOUTUBE',
    "source_video_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel_name" TEXT,
    "thumbnail" TEXT,
    "duration_seconds" INTEGER,
    "view_count" INTEGER,
    "like_count" INTEGER,
    "published_at" TIMESTAMP(3),
    "status" "DiscoveryStatus" NOT NULL,
    "application_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovered_podcasts_pkey" PRIMARY KEY ("discovery_id")
);

-- CreateIndex
CREATE INDEX "discovered_podcasts_application_id_status_idx" ON "discovered_podcasts"("application_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_podcasts_application_id_source_video_id_key" ON "discovered_podcasts"("application_id", "source_video_id");

-- AddForeignKey
ALTER TABLE "discovered_podcasts" ADD CONSTRAINT "discovered_podcasts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;
