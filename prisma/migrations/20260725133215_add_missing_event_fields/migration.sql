-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "contactInfo" JSONB,
ADD COLUMN     "facultyCoordinator" TEXT,
ADD COLUMN     "facultyIncharge" TEXT,
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "school" TEXT,
ADD COLUMN     "sponsorshipDetails" JSONB,
ADD COLUMN     "studentCoordinators" TEXT[];

-- AlterTable
ALTER TABLE "EventProposal" ADD COLUMN     "clubHead" TEXT,
ADD COLUMN     "contactInfo" JSONB,
ADD COLUMN     "departmentHead" TEXT,
ADD COLUMN     "eventCategory" TEXT,
ADD COLUMN     "facultyIncharge" TEXT,
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "school" TEXT,
ADD COLUMN     "sponsorshipDetails" JSONB;

-- AlterTable
ALTER TABLE "EventReport" ADD COLUMN     "contactInfo" JSONB,
ADD COLUMN     "eventCategory" TEXT,
ADD COLUMN     "facultyIncharge" TEXT,
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "sponsorshipDetails" JSONB;

-- CreateIndex
CREATE INDEX "Event_approvalStatus_idx" ON "Event"("approvalStatus");
