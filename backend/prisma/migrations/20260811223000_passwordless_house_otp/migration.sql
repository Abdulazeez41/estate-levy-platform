CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "loginHouseNumber" TEXT;

UPDATE "User" u SET "loginHouseNumber" = h."houseNumber"
FROM "Household" h WHERE h."residentId" = u."id";

UPDATE "User" SET "loginHouseNumber" = 'Block A, Flat 1'
WHERE "role" = 'CHAIRMAN' AND "loginHouseNumber" IS NULL;

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "OtpChannel" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "destinationMasked" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "requestedIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_loginHouseNumber_key" ON "User"("loginHouseNumber");
CREATE INDEX "OtpChallenge_userId_createdAt_idx" ON "OtpChallenge"("userId", "createdAt");
CREATE INDEX "OtpChallenge_requestedIp_createdAt_idx" ON "OtpChallenge"("requestedIp", "createdAt");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
