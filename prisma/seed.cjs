const { PrismaClient, TaskType } = require("../src/generated");

const prisma = new PrismaClient();

async function main() {
  // Clear existing templates for idempotent seed in dev
  await prisma.templateStep.deleteMany();
  await prisma.template.deleteMany();

  // Termination (ICANN) template
  await prisma.template.create({
    data: {
      name: "Termination (ICANN)",
      taskType: TaskType.TERMINATION,
      version: 1,
      isDefault: true,
      steps: {
        create: [
          { order: 1, title: "Intake ICANN Notice" },
          { order: 2, title: "Confirm GoDaddy Registry Accreditation (Scope Check)" },
          { order: 3, title: "Open & Route Salesforce Cases (External + Internal)" },
          { order: 4, title: "File & Evidence Saved (Case + OneDrive)" },
          { order: 5, title: "Apply / Schedule \"READ ONLY\" Enforcement" },
          { order: 6, title: "Wait for Accreditation Direction (Internal Gate)" },
          { order: 7, title: "Notify Gaining Registrar + Lock Transfer Window" },
          { order: 8, title: "CN/TW Special Handling (Conditional)", isConditional: true },
          { order: 9, title: "Execute Bulk Transfer + Send Completion Package" },
          { order: 10, title: "Termination Teardown & Notifications (SFDC + Platforms + Repo + Firewall + Certs + Billing)" },
        ],
      },
    },
  });

  // Name Change / Assignment template (shared)
  const nameChange = await prisma.template.create({
    data: {
      name: "Name Change / Assignment",
      taskType: TaskType.NAME_CHANGE,
      version: 1,
      isDefault: true,
      steps: {
        create: [
          { order: 1, title: "Intake & Scope Capture (from ICANN Weekly case)" },
          { order: 2, title: "Create Two Internal Salesforce Cases (Working + Ops Approval)" },
          { order: 3, title: "Approval Gate — Registry Ops" },
          { order: 4, title: "Salesforce Account Update (Authoritative Record)" },
          { order: 5, title: "Portal Updates — Gateway (Conditional: CN/TW only, BOTH OTE + PROD)", isConditional: true },
          { order: 6, title: "Portal Updates — Narwhal (Always, BOTH OTE + PROD)" },
          { order: 7, title: "Firewall \"Name Update Only\" Tickets (AU always, Glare conditional)" },
          { order: 8, title: "Notifications & Outreach (Billing + Business Teams + Registrar/AAF)" },
          { order: 9, title: "Assignment/Merger Final Check (Conditional)", isConditional: true },
        ],
      },
    },
  });

  // ASSIGNMENT uses same template structure as NAME_CHANGE
  const nameChangeSteps = await prisma.templateStep.findMany({
    where: { templateId: nameChange.id },
    orderBy: { order: "asc" },
  });

  await prisma.template.create({
    data: {
      name: "Name Change / Assignment",
      taskType: TaskType.ASSIGNMENT,
      version: 1,
      isDefault: true,
      steps: {
        create: nameChangeSteps.map((s) => ({
          order: s.order,
          title: s.title,
          isConditional: s.isConditional,
        })),
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
