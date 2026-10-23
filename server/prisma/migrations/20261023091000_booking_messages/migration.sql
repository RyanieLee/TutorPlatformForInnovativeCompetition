CREATE TABLE "BookingMessage" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "bookingId" TEXT NOT NULL,
 "senderId" TEXT NOT NULL,
 "senderRole" TEXT NOT NULL,
 "requestId" TEXT NOT NULL,
 "text" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BookingMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BookingMessage_bookingId_senderId_requestId_key" ON "BookingMessage"("bookingId","senderId","requestId");
CREATE INDEX "BookingMessage_bookingId_createdAt_id_idx" ON "BookingMessage"("bookingId","createdAt","id");
