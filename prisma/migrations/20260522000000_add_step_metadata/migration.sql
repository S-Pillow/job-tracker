-- AlterTable
ALTER TABLE "TemplateStep" ADD COLUMN "description" TEXT;
ALTER TABLE "TemplateStep" ADD COLUMN "isGate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TemplateStep" ADD COLUMN "isStopWarning" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Step" ADD COLUMN "description" TEXT;
ALTER TABLE "Step" ADD COLUMN "isGate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Step" ADD COLUMN "isStopWarning" BOOLEAN NOT NULL DEFAULT false;
