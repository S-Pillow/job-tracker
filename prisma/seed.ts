import path from "path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/client";
import { TaskType, StepStatus } from "../src/generated/enums";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

type StepTemplate = {
  order: number;
  title: string;
  description: string;
  isConditional?: boolean;
  isGate?: boolean;
  isStopWarning?: boolean;
};

const TERMINATION_STEPS: StepTemplate[] = [
  {
    order: 1,
    title: "Review ICANN Weekly Announcement",
    description: "Check attachment for registrar terminations and confirm scope of affected registrar(s)",
  },
  {
    order: 2,
    title: "Verify GoDaddy Registry Accreditation",
    description: "Search Salesforce, Narwhal, GWP, and Tango — close case if no GoDaddy Registry accreditation match found",
  },
  {
    order: 3,
    title: "Create Salesforce Cases (External + Internal)",
    description: "Case #1 for registrar comms in TAM queue; Case #2 as child of #1 for internal — send to Registry Ops Escalation Queue",
  },
  {
    order: 4,
    title: "Save ICANN Spreadsheet to Case & OneDrive",
    description: "Attach to Case #2 file section and save to Registrar Profile folder — format: IANA-#####_ICANNWeekly_YYYY-MMM-DD",
  },
  {
    order: 5,
    title: "Apply or Schedule READ ONLY Enforcement",
    description: "Past/no effective date: apply now. Future date: set task for team to apply on the effective date",
  },
  {
    order: 6,
    title: "Wait for Accreditation Team Confirmation",
    description: "Follow up with Reg Ops via Slack after 2 business days if no response — do not proceed until confirmed",
    isGate: true,
  },
  {
    order: 7,
    title: "Notify Gaining Registrar with Transfer Date/Time",
    description: "Provide a specific date/time (do not let them choose) — forward ICANN notice with ICANN contact info removed",
  },
  {
    order: 8,
    title: "CN/TW CNNIC/TWNIC Notification",
    description: "Use Bulk Upload tool to pull CN/TW domains, email CNNIC/TWNIC, and create child case to Gateway Escalations Queue",
    isConditional: true,
  },
  {
    order: 9,
    title: "Process Bulk Transfer",
    description: "Begin only after gaining registrar confirms the scheduled transfer date/time",
  },
  {
    order: 10,
    title: "Send Completion Email & DUM Spreadsheet",
    description: "Do not proceed until bulk transfer is fully complete — email gaining registrar with full DUM spreadsheet attached",
    isStopWarning: true,
  },
  {
    order: 11,
    title: "Update Salesforce Account, Contacts & TLD Accreditations",
    description: "Rename account to 'ICANN TERM + Name (YYYY-MON-DD)', update RA Status toggle, and disable portal users",
  },
  {
    order: 12,
    title: "Revoke Salesforce Support Portal Access",
    description: "In Customer Portal Users section, disable all active registrar users",
  },
  {
    order: 13,
    title: "Update Registrar Name in All Platforms",
    description: "Update in Narwhal (Accounts + Registrars), Tango, and Gateway Web Portal — append 'ICANN TERMINATED (DDMMMYYYY)'",
  },
  {
    order: 14,
    title: "Revoke Platform Access (Narwhal, Tango, GWP)",
    description: "Narwhal: set zones to NONE (OTE + Prod), suspend users with REVOKED-YYYYMMDD prefix. Tango + GWP: disable and set TERMINATED",
  },
  {
    order: 15,
    title: "Disable Registry File Repository Access",
    description: "Create child case to Narwhal Platform Escalations Queue to remove file repository access",
  },
  {
    order: 16,
    title: "Remove IPs from Firewall",
    description: "Note IPs from GitHub — create child cases for Gateway and Narwhal/.IN firewall removal (not required for Tango)",
  },
  {
    order: 17,
    title: "Revoke EPP & Web Portal SSL Certificates",
    description: "Open CAKE and revoke all EPP and Web Portal SSL certificates for the registrar",
  },
  {
    order: 18,
    title: "Notify Billing Team of Termination",
    description: "Create child case to Billing Escalation Queue to notify billing of the completed termination",
  },
];

function buildSteps(completedUpTo: number, skipStep8 = false): Array<{
  order: number;
  title: string;
  description: string;
  isConditional: boolean;
  isGate: boolean;
  isStopWarning: boolean;
  status: StepStatus;
}> {
  return TERMINATION_STEPS.map((s) => {
    let status: StepStatus = StepStatus.NOT_STARTED;
    if (s.order < completedUpTo) {
      status = StepStatus.COMPLETE;
    } else if (s.order === completedUpTo) {
      status = StepStatus.IN_PROGRESS;
    }
    if (skipStep8 && s.order === 8) {
      status = StepStatus.NA;
    }
    return {
      order: s.order,
      title: s.title,
      description: s.description,
      isConditional: s.isConditional ?? false,
      isGate: s.isGate ?? false,
      isStopWarning: s.isStopWarning ?? false,
      status,
    };
  });
}

async function main() {
  await prisma.step.deleteMany();
  await prisma.task.deleteMany();
  await prisma.templateStep.deleteMany();
  await prisma.template.deleteMany();

  const termTemplate = await prisma.template.create({
    data: {
      name: "ICANN Registrar Termination",
      taskType: TaskType.TERMINATION,
      version: 2,
      isDefault: true,
      steps: {
        create: TERMINATION_STEPS.map((s) => ({
          order: s.order,
          title: s.title,
          description: s.description,
          isConditional: s.isConditional ?? false,
          isGate: s.isGate ?? false,
          isStopWarning: s.isStopWarning ?? false,
        })),
      },
    },
  });

  console.log(`Created template: ${termTemplate.id}`);

  // Task 1 — Early stage (step 3 in progress, no CN/TW)
  await prisma.task.create({
    data: {
      taskType: TaskType.TERMINATION,
      caseNumber: "TERM-2024-001",
      registrarName: "Acme Domains Inc.",
      ianaId: "1234",
      hasGatewayCnTw: false,
      terminationType: "ICANN Termination",
      terminationEffectiveDate: new Date("2024-03-15"),
      icannNoticeDate: new Date("2024-02-28"),
      gainingRegistrarName: "SafeHarbor Registrar LLC",
      gainingRegistrarIanaId: "9876",
      templateId: termTemplate.id,
      steps: {
        create: buildSteps(3, true),
      },
    },
  });

  // Task 2 — Mid-workflow (waiting at gate, step 6)
  await prisma.task.create({
    data: {
      taskType: TaskType.TERMINATION,
      caseNumber: "TERM-2024-002",
      registrarName: "BlueSky Registrar Corp.",
      ianaId: "5678",
      hasGatewayCnTw: true,
      terminationType: "ICANN Termination",
      terminationEffectiveDate: new Date("2024-04-01"),
      icannNoticeDate: new Date("2024-03-10"),
      gainingRegistrarName: "TrustDomain Services",
      gainingRegistrarIanaId: "4321",
      templateId: termTemplate.id,
      steps: {
        create: buildSteps(6, false),
      },
    },
  });

  // Task 3 — Teardown phase in progress (step 13)
  await prisma.task.create({
    data: {
      taskType: TaskType.TERMINATION,
      caseNumber: "TERM-2024-003",
      registrarName: "Global Names Solutions Ltd.",
      ianaId: "9999",
      hasGatewayCnTw: false,
      terminationType: "Terminated for Cause",
      terminationEffectiveDate: new Date("2024-01-20"),
      gainingRegistrarName: "NextGen Registrar",
      gainingRegistrarIanaId: "7654",
      templateId: termTemplate.id,
      steps: {
        create: buildSteps(13, true),
      },
    },
  });

  // Task 4 — Self termination, brand new
  await prisma.task.create({
    data: {
      taskType: TaskType.TERMINATION,
      caseNumber: "TERM-2024-004",
      registrarName: "Sunrise Internet Services",
      ianaId: "3333",
      hasGatewayCnTw: false,
      terminationType: "Self Termination",
      terminationEffectiveDate: new Date("2024-05-01"),
      gainingRegistrarName: "Apex Domain Partners",
      gainingRegistrarIanaId: "2222",
      templateId: termTemplate.id,
      steps: {
        create: buildSteps(1, true),
      },
    },
  });

  console.log("Seeded 4 termination tasks with 18 steps each.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
