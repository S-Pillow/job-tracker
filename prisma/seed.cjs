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

  // Name Change template
  const nameChange = await prisma.template.create({
    data: {
      name: "Registrar Name Change",
      taskType: TaskType.NAME_CHANGE,
      version: 1,
      isDefault: true,
      steps: {
        create: [
          {
            order: 1,
            title: "Review ICANN Notice",
            description: "Note the registrar's new name, IANA ID, and effective date from the ICANN notice.",
          },
          {
            order: 2,
            title: "Search by IANA ID — Confirm Current Name",
            description: "Search the IANA database by IANA ID to find the registrar's current (old) name.",
          },
          {
            order: 3,
            title: "Review GoDaddy Registry Accreditations",
            description: "Note all GoDaddy Registry accreditations to determine which platforms must be updated.",
          },
          {
            order: 4,
            title: "Create Salesforce Cases",
            description: "Create the required Salesforce cases for the registrar name change update.",
          },
          {
            order: 5,
            title: "Update Salesforce Account",
            description:
              "a. Update Description section with ICANN case #, effective date, new name, old name, and IANA ID. " +
              "b. Update Formerly Known As field with the old name. " +
              "c. Update account name to the new name exactly as it appears in the ICANN notice. " +
              "d. Attach the ICANN name change notice (.xlsx) to Notes & Attachments. " +
              "e. Add a note to Notes & Attachments matching the Description section.",
          },
          {
            order: 6,
            title: "Update Narwhal Platform",
            description:
              "Edit the registrar in both OTE and Production. Update registrar name in Account Management and Registrars sections. " +
              "Do not update the Cert Org field. Also update WHOIS server, referral URL, abuse contact, and other contacts if changed. " +
              "Confirm changes with the registrar by sending an AAF.",
          },
          {
            order: 7,
            title: "Update Gateway Platform",
            description: "Edit the registrar in both Gateway OTE and Gateway Production.",
            isConditional: true,
          },
          {
            order: 8,
            title: "Create Firewall Ticket",
            description:
              "Create a ticket to update the registrar name in the firewall for Narwhal and Gateway, if applicable.",
            isConditional: true,
          },
          {
            order: 9,
            title: "Create Billing Ticket",
            description: "Create a ticket for Billing to update the registrar name.",
          },
          {
            order: 10,
            title: "Notify Business Teams",
            description: "Notify the business teams of the registrar name change update.",
          },
          {
            order: 11,
            title: "Notify Registrar — Update Complete",
            description: "Notify the registrar that the name change update has been completed.",
          },
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
