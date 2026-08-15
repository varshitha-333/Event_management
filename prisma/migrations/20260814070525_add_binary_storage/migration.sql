-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "qrCodeData" BYTEA,
ADD COLUMN     "qrCodeFilename" TEXT,
ADD COLUMN     "qrCodeMimeType" TEXT;

-- AlterTable
ALTER TABLE "EventProposal" ADD COLUMN     "pdfData" BYTEA,
ADD COLUMN     "pdfFilename" TEXT,
ADD COLUMN     "pdfMimeType" TEXT;

-- AlterTable
ALTER TABLE "EventReport" ADD COLUMN     "pdfData" BYTEA,
ADD COLUMN     "pdfFilename" TEXT,
ADD COLUMN     "pdfMimeType" TEXT;

-- CreateIndex
CREATE INDEX "Photo_uploadedAt_idx" ON "Photo"("uploadedAt");
