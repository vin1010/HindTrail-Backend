import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.activity.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.document.deleteMany();
  await prisma.workPackage.deleteMany();
  await prisma.project.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.userLastContext.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: "vindy@roteq.co.za",
      fullName: "Vindy Sharma",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "john@glencore.com",
      fullName: "John Smith",
    },
  });

  console.log("✅ Created users");

  // Create companies
  const glencore = await prisma.company.create({
    data: { name: "Glencore Ltd", type: "client" },
  });

  const roteq = await prisma.company.create({
    data: { name: "Roteq Engineering", type: "contractor" },
  });

  const sasolOil = await prisma.company.create({
    data: { name: "SasolOil", type: "client" },
  });

  const subContract = await prisma.company.create({
    data: { name: "Sub-Engineering Solutions", type: "contractor" },
  });

  const independent = await prisma.company.create({
    data: { name: "Alex Martinez (Independent)", type: "independent" },
  });

  console.log("✅ Created companies");

  // Create company memberships
  await prisma.companyUser.createMany({
    data: [
      { userId: user1.id, companyId: roteq.id, role: "admin", status: "active" },
      { userId: user2.id, companyId: glencore.id, role: "admin", status: "active" },
    ],
  });

  console.log("✅ Created memberships");

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: "Refinery Turnaround 2026",
      code: "RT-2026",
      clientName: "Glencore",
      clientCompanyId: glencore.id,
      location: "Secunda, South Africa",
      startDate: "2026-04-15",
      endDate: "2026-08-30",
      status: "Active",
      description: "Major turnaround maintenance and equipment replacement",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Equipment Installation Phase 2",
      code: "EIP-2026",
      clientName: "SasolOil",
      clientCompanyId: sasolOil.id,
      location: "Sasolburg, South Africa",
      startDate: "2026-05-01",
      endDate: "2026-09-15",
      status: "Active",
      description: "Installation of new production equipment and automation systems",
    },
  });

  console.log("✅ Created projects");

  // Create work packages
  const pkg1 = await prisma.workPackage.create({
    data: {
      projectId: project1.id,
      name: "Boiler System Overhaul",
      code: "WP-BS-001",
      ownerCompanyId: roteq.id,
      ownerCompany: "Roteq Engineering",
      responsible: "John Engineer",
      dueDate: "2026-06-30",
      status: "In Progress",
      description: "Complete overhaul and maintenance of boiler systems",
    },
  });

  const pkg2 = await prisma.workPackage.create({
    data: {
      projectId: project1.id,
      parentId: pkg1.id,
      name: "Boiler Tube Replacement",
      code: "WP-BTR-001",
      ownerCompanyId: subContract.id,
      ownerCompany: "Sub-Engineering Solutions",
      responsible: "Mike technician",
      dueDate: "2026-06-15",
      status: "Awaiting Approval",
      description: "Replace worn boiler tubes with new high-pressure rated tubes",
    },
  });

  const pkg3 = await prisma.workPackage.create({
    data: {
      projectId: project2.id,
      name: "Control System Installation",
      code: "WP-CSI-001",
      ownerCompanyId: roteq.id,
      ownerCompany: "Roteq Engineering",
      responsible: "Sarah Controls",
      dueDate: "2026-07-20",
      status: "Not Started",
      description: "Install and configure new automated control systems",
    },
  });

  console.log("✅ Created work packages");

  // Create documents
  await prisma.document.createMany({
    data: [
      {
        packageId: pkg1.id,
        title: "Boiler System Inspection Report",
        type: "Report",
        revision: "Rev A",
        status: "Approved for Use",
        uploadedBy: "John Engineer",
        uploadDate: "2026-04-10",
        isCurrent: true,
        notes: "Full inspection completed, all issues documented",
      },
      {
        packageId: pkg1.id,
        title: "Boiler System Inspection Report",
        type: "Report",
        revision: "Rev A (Draft)",
        status: "Draft",
        uploadedBy: "John Engineer",
        uploadDate: "2026-04-08",
        isCurrent: false,
        notes: "Draft version with preliminary findings",
      },
      {
        packageId: pkg2.id,
        title: "Tube Replacement Procedure",
        type: "Procedure",
        revision: "Rev B",
        status: "Approved for Use",
        uploadedBy: "Mike technician",
        uploadDate: "2026-04-12",
        isCurrent: true,
        notes: "Updated procedure with safety requirements",
      },
      {
        packageId: pkg3.id,
        title: "Control System Design Specification",
        type: "Drawing",
        revision: "Rev 1",
        status: "Submitted",
        uploadedBy: "Sarah Controls",
        uploadDate: "2026-04-14",
        isCurrent: true,
        notes: "Design ready for review and approval",
      },
    ],
  });

  console.log("✅ Created documents");

  // Create inspections
  await prisma.inspection.createMany({
    data: [
      {
        packageId: pkg1.id,
        type: "Safety Inspection",
        date: "2026-04-10",
        inspector: "Safety Officer",
        result: "Approved",
        notes: "All safety requirements met",
      },
      {
        packageId: pkg2.id,
        type: "Quality Inspection",
        date: "2026-04-13",
        inspector: "QA Manager",
        result: "Open",
        notes: "Pending final material certification",
      },
      {
        packageId: pkg3.id,
        type: "Design Review",
        date: "2026-04-15",
        inspector: "Lead Engineer",
        result: "Open",
        notes: "Awaiting client feedback on specifications",
      },
    ],
  });

  console.log("✅ Created inspections");

  // Create issues
  await prisma.issue.createMany({
    data: [
      {
        packageId: pkg1.id,
        title: "Delayed tube delivery",
        description: "Replacement tubes delayed by supplier",
        severity: "Major",
        owner: "John Engineer",
        dueDate: "2026-04-20",
        status: "Open",
      },
      {
        packageId: pkg2.id,
        title: "Material certification pending",
        description: "Awaiting third-party material certification",
        severity: "Minor",
        owner: "Mike technician",
        dueDate: "2026-04-25",
        status: "Open",
      },
      {
        packageId: pkg3.id,
        title: "Design clarification needed",
        description: "Client requested clarification on control logic",
        severity: "Major",
        owner: "Sarah Controls",
        dueDate: "2026-04-30",
        status: "Open",
      },
    ],
  });

  console.log("✅ Created issues");

  // Create approvals
  await prisma.approval.createMany({
    data: [
      {
        packageId: pkg1.id,
        objectType: "Document",
        objectLabel: "Inspection Report Rev A",
        submittedBy: "John Engineer",
        submittedDate: "2026-04-10",
        approver: "Project Manager",
        decision: "Approved",
        decisionDate: "2026-04-11",
        comments: "All requirements met, approved for use",
      },
      {
        packageId: pkg2.id,
        objectType: "Procedure",
        objectLabel: "Tube Replacement Procedure Rev B",
        submittedBy: "Mike technician",
        submittedDate: "2026-04-12",
        approver: "Safety Manager",
        decision: "Pending",
        comments: "",
      },
      {
        packageId: pkg3.id,
        objectType: "Specification",
        objectLabel: "Control System Design",
        submittedBy: "Sarah Controls",
        submittedDate: "2026-04-14",
        approver: "Client Representative",
        decision: "Pending",
        comments: "",
      },
    ],
  });

  console.log("✅ Created approvals");

  // Create activity log
  await prisma.activity.createMany({
    data: [
      {
        packageId: pkg1.id,
        userId: user1.id,
        user: "Vindy Sharma",
        company: "Roteq Engineering",
        actionType: "Created",
        objectType: "Work Package",
        objectLabel: "Boiler System Overhaul",
        timestamp: new Date("2026-04-08"),
      },
      {
        packageId: pkg1.id,
        userId: user1.id,
        user: "Vindy Sharma",
        company: "Roteq Engineering",
        actionType: "Uploaded",
        objectType: "Document",
        objectLabel: "Inspection Report Rev A",
        timestamp: new Date("2026-04-10"),
      },
      {
        packageId: pkg1.id,
        userId: user1.id,
        user: "Vindy Sharma",
        company: "Roteq Engineering",
        actionType: "Submitted for Approval",
        objectType: "Document",
        objectLabel: "Inspection Report Rev A",
        timestamp: new Date("2026-04-10"),
      },
      {
        packageId: pkg1.id,
        userId: user2.id,
        user: "John Smith",
        company: "Glencore Ltd",
        actionType: "Approved",
        objectType: "Document",
        objectLabel: "Inspection Report Rev A",
        timestamp: new Date("2026-04-11"),
      },
      {
        packageId: pkg2.id,
        userId: user1.id,
        user: "Vindy Sharma",
        company: "Roteq Engineering",
        actionType: "Created",
        objectType: "Sub-package",
        objectLabel: "Boiler Tube Replacement",
        timestamp: new Date("2026-04-09"),
      },
      {
        packageId: pkg3.id,
        userId: user1.id,
        user: "Vindy Sharma",
        company: "Roteq Engineering",
        actionType: "Created",
        objectType: "Work Package",
        objectLabel: "Control System Installation",
        timestamp: new Date("2026-04-12"),
      },
    ],
  });

  console.log("✅ Created activity log");

  console.log("✨ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
