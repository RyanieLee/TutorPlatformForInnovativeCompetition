-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "previewText" TEXT NOT NULL DEFAULT '',
    "homeworkText" TEXT NOT NULL,
    "dueAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "requestId" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "publishedFingerprint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeachingAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT '',
    "size" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL,
    "uploadState" TEXT NOT NULL DEFAULT 'uploading',
    "reservedBytes" INTEGER NOT NULL DEFAULT 0,
    "quotaDate" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeachingAttachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeachingAttachment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonAttachment" (
    "lessonId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,

    PRIMARY KEY ("lessonId", "attachmentId"),
    CONSTRAINT "LessonAttachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LessonAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "TeachingAttachment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL,
    "late" BOOLEAN NOT NULL,
    CONSTRAINT "HomeworkSubmission_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HomeworkSubmission_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubmissionAttachment" (
    "submissionId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,

    PRIMARY KEY ("submissionId", "attachmentId"),
    CONSTRAINT "SubmissionAttachment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "HomeworkSubmission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SubmissionAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "TeachingAttachment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadQuota" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "usedBytes" INTEGER NOT NULL DEFAULT 0,
    "reservedBytes" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "day"),
    CONSTRAINT "UploadQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Lesson_bookingId_status_scheduledAt_createdAt_id_idx" ON "Lesson"("bookingId", "status", "scheduledAt", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_bookingId_requestId_key" ON "Lesson"("bookingId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAttachment_storageKey_key" ON "TeachingAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "TeachingAttachment_uploadState_expiresAt_idx" ON "TeachingAttachment"("uploadState", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonAttachment_attachmentId_key" ON "LessonAttachment"("attachmentId");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_lessonId_revision_idx" ON "HomeworkSubmission"("lessonId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_lessonId_revision_key" ON "HomeworkSubmission"("lessonId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_parentId_requestId_key" ON "HomeworkSubmission"("parentId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionAttachment_attachmentId_key" ON "SubmissionAttachment"("attachmentId");
