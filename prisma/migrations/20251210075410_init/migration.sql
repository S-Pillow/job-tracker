-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "TemplateStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "isConditional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "taskType" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "registrarName" TEXT NOT NULL,
    "ianaId" TEXT NOT NULL,
    "tldScope" TEXT,
    "hasGatewayCnTw" BOOLEAN NOT NULL,
    "terminationType" TEXT,
    "terminationEffectiveDate" DATETIME,
    "gainingRegistrarName" TEXT,
    "gainingRegistrarIanaId" TEXT,
    "icannNoticeDate" DATETIME,
    "icannNoticeFilePath" TEXT,
    "oldRegistrarName" TEXT,
    "newRegistrarName" TEXT,
    "ccid" TEXT,
    "taskSubtype" TEXT,
    "aafRequested" BOOLEAN NOT NULL DEFAULT false,
    "aafRequestedDate" DATETIME,
    "aafReceived" BOOLEAN NOT NULL DEFAULT false,
    "aafReceivedDate" DATETIME,
    "cnnicTwnicNotified" BOOLEAN NOT NULL DEFAULT false,
    "caseAId" TEXT,
    "caseBId" TEXT,
    "templateId" TEXT,
    CONSTRAINT "Task_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "taskId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "blockedReason" TEXT,
    "isConditional" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Step_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_taskType_version_key" ON "Template"("taskType", "version");

-- CreateIndex
CREATE INDEX "TemplateStep_templateId_order_idx" ON "TemplateStep"("templateId", "order");

-- CreateIndex
CREATE INDEX "Step_taskId_order_idx" ON "Step"("taskId", "order");
