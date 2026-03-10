-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verification_code" TEXT,
ADD COLUMN     "email_verification_expires" TIMESTAMP(3);
