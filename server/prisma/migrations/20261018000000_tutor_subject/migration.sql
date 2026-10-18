CREATE TABLE "TutorSubject" (
    "tutorProfileId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    PRIMARY KEY ("tutorProfileId", "subject"),
    CONSTRAINT "TutorSubject_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TutorSubject_subject_tutorProfileId_idx" ON "TutorSubject"("subject", "tutorProfileId");

-- Existing tutor profiles retain their JSON field; index every valid stored subject.
INSERT OR IGNORE INTO "TutorSubject" ("tutorProfileId", "subject")
SELECT p."id", j.value
FROM "TutorProfile" AS p, json_each(p."subjectsJson") AS j
WHERE j.type = 'text' AND length(j.value) > 0;
