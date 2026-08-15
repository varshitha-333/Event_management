-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WORKSHOP', 'SEMINAR', 'LECTURE', 'SYMPOSIUM', 'COMPETITION', 'CULTURAL', 'HACKATHON', 'CONFERENCE', 'PANEL_DISCUSSION', 'EXHIBITION', 'OTHER');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('OFFLINE', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ATTENDED', 'REGISTERED_DIDNT_ATTEND', 'DIDNT_REGISTER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'GENERATED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "department" TEXT NOT NULL,
    "year" INTEGER,
    "branch" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "theme" TEXT,
    "venue" TEXT NOT NULL,
    "mode" "EventMode" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "currentCapacity" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(65,30),
    "actualCost" DECIMAL(65,30),
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "poster" TEXT,
    "tags" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "rating" INTEGER NOT NULL,
    "liked" TEXT[],
    "disliked" TEXT[],
    "suggestions" TEXT NOT NULL,
    "freeText" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "department" TEXT,
    "year" INTEGER,
    "branch" TEXT,
    "role" "UserRole",
    "attendance" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProposal" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "eventName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTheme" TEXT NOT NULL,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "eventTime" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "facultyCoordinator" TEXT NOT NULL,
    "studentCoordinators" TEXT[],
    "clubName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "resourcePerson" JSONB,
    "expectedParticipants" INTEGER NOT NULL,
    "budgetItems" JSONB NOT NULL,
    "logistics" JSONB NOT NULL,
    "registrationLink" TEXT,
    "brochureLink" TEXT,
    "description" TEXT NOT NULL,
    "objectives" TEXT[],
    "targetAudience" TEXT NOT NULL,
    "eventSchedule" JSONB NOT NULL,
    "publicityPlan" TEXT NOT NULL,
    "expectedOutcomes" TEXT[],
    "risksAndMitigation" TEXT NOT NULL,
    "aiJson" JSONB NOT NULL,
    "latexContent" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "texFile" TEXT,
    "generatedAt" TIMESTAMP(3),
    "regeneratedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReport" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "eventName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "facultyCoordinator" TEXT NOT NULL,
    "studentCoordinators" TEXT[],
    "resourcePerson" JSONB,
    "actualParticipants" INTEGER NOT NULL,
    "participantStats" JSONB NOT NULL,
    "budgetUtilized" JSONB NOT NULL,
    "links" JSONB NOT NULL,
    "socialMediaLinks" TEXT[],
    "photos" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" TEXT[],
    "eventProceedings" TEXT NOT NULL,
    "keyHighlights" TEXT[],
    "learningOutcomes" TEXT[],
    "feedbackSummary" TEXT NOT NULL,
    "mediaCoverage" TEXT NOT NULL,
    "futureRecommendations" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "aiJson" JSONB NOT NULL,
    "latexContent" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "texFile" TEXT,
    "generatedAt" TIMESTAMP(3),
    "regeneratedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "expectedAudience" TEXT,
    "resourcesNeeded" TEXT,
    "estimatedBudget" TEXT,
    "additionalNotes" TEXT,
    "status" "IdeaStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventIdea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_department_idx" ON "User"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");

-- CreateIndex
CREATE INDEX "Event_clubId_idx" ON "Event"("clubId");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Review_eventId_idx" ON "Review"("eventId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "EventProposal_eventId_key" ON "EventProposal"("eventId");

-- CreateIndex
CREATE INDEX "EventProposal_eventId_idx" ON "EventProposal"("eventId");

-- CreateIndex
CREATE INDEX "EventProposal_status_idx" ON "EventProposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventReport_eventId_key" ON "EventReport"("eventId");

-- CreateIndex
CREATE INDEX "EventReport_eventId_idx" ON "EventReport"("eventId");

-- CreateIndex
CREATE INDEX "EventReport_status_idx" ON "EventReport"("status");

-- CreateIndex
CREATE INDEX "EventIdea_department_idx" ON "EventIdea"("department");

-- CreateIndex
CREATE INDEX "EventIdea_status_idx" ON "EventIdea"("status");

-- CreateIndex
CREATE INDEX "EventIdea_proposedDate_idx" ON "EventIdea"("proposedDate");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProposal" ADD CONSTRAINT "EventProposal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReport" ADD CONSTRAINT "EventReport_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
