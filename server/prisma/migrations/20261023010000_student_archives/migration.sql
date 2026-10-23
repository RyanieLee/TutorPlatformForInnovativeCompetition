CREATE TABLE "StudentArchive" (
 "id" TEXT NOT NULL PRIMARY KEY, "parentId" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0,
 "requestId" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL, "stateJson" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "StudentArchive_parentId_requestId_key" ON "StudentArchive"("parentId", "requestId");
CREATE INDEX "StudentArchive_parentId_createdAt_idx" ON "StudentArchive"("parentId", "createdAt");
CREATE TABLE "ArchiveBooking" (
 "bookingId" TEXT NOT NULL PRIMARY KEY, "archiveId" TEXT NOT NULL,
 CONSTRAINT "ArchiveBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ArchiveBooking_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "StudentArchive" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ArchiveBooking_archiveId_idx" ON "ArchiveBooking"("archiveId");
