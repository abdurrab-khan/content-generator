/*
  Warnings:

  - You are about to drop the column `status` on the `discovered_podcasts` table. All the data in the column will be lost.
  - Added the required column `podcastType` to the `discovered_podcasts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `podcasterName` to the `discovered_podcasts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PodcastType" AS ENUM ('POPULAR', 'TRANDING');

-- DropIndex
DROP INDEX "discovered_podcasts_application_id_status_idx";

-- AlterTable
ALTER TABLE "discovered_podcasts" DROP COLUMN "status",
ADD COLUMN     "podcastType" "PodcastType" NOT NULL,
ADD COLUMN     "podcasterName" TEXT NOT NULL;

-- DropEnum
DROP TYPE "DiscoveryStatus";

-- CreateIndex
CREATE INDEX "discovered_podcasts_application_id_idx" ON "discovered_podcasts"("application_id");
