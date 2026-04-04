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

  // ─── Users ───────────────────────────────────────────────────
  const user1 = await prisma.user.create({ data: { email: "vindy@roteq.co.za", fullName: "Vindy Sharma" } });
  const user2 = await prisma.user.create({ data: { email: "john@glencore.com", fullName: "John Smith" } });
  console.log("✅ Created users");

  // ─── Companies ───────────────────────────────────────────────
  const glencore   = await prisma.company.create({ data: { name: "Glencore Ltd", type: "client" } });
  const sasolOil   = await prisma.company.create({ data: { name: "SasolOil", type: "client" } });
  const roteq      = await prisma.company.create({ data: { name: "Roteq Engineering", type: "contractor" } });
  const protech    = await prisma.company.create({ data: { name: "ProTech Solutions", type: "contractor" } });
  const apex       = await prisma.company.create({ data: { name: "Apex Mechanical", type: "contractor" } });
  const subA       = await prisma.company.create({ data: { name: "Sub-Engineering Solutions", type: "contractor" } });
  const subB       = await prisma.company.create({ data: { name: "BoltWorks CC", type: "contractor" } });
  const subC       = await prisma.company.create({ data: { name: "PipeSpec (Pty) Ltd", type: "contractor" } });
  console.log("✅ Created companies");

  // ─── Memberships ─────────────────────────────────────────────
  await prisma.companyUser.createMany({
    data: [
      { userId: user1.id, companyId: roteq.id,    role: "admin", status: "active" },
      { userId: user2.id, companyId: glencore.id,  role: "admin", status: "active" },
    ],
  });
  console.log("✅ Created memberships");

  // ─── Projects ────────────────────────────────────────────────
  const proj1 = await prisma.project.create({
    data: {
      name: "Refinery Turnaround 2026",
      code: "RT-2026",
      clientName: "Glencore",
      clientCompanyId: glencore.id,
      location: "Secunda, South Africa",
      startDate: "2026-04-15",
      endDate: "2026-08-30",
      status: "Active",
      description: "Major turnaround maintenance and equipment replacement across all refinery units.",
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      name: "Equipment Installation Phase 2",
      code: "EIP-2026",
      clientName: "SasolOil",
      clientCompanyId: sasolOil.id,
      location: "Sasolburg, South Africa",
      startDate: "2026-05-01",
      endDate: "2026-09-15",
      status: "Active",
      description: "Installation of new production equipment and automation systems.",
    },
  });
  console.log("✅ Created projects");

  // ─── Work Packages — Project 1 (Refinery Turnaround) ─────────
  // C1: Roteq Engineering — Boiler scope
  const c1 = await prisma.workPackage.create({ data: {
    projectId: proj1.id, name: "Boiler System Overhaul", code: "WP-BS-001",
    ownerCompanyId: roteq.id, ownerCompany: "Roteq Engineering", responsible: "Vindy Sharma",
    dueDate: "2026-06-30", status: "In Progress",
    description: "Complete overhaul and maintenance of boiler systems.",
  }});

  // C1 → S1: Sub-Engineering (tube replacement)
  const c1s1 = await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c1.id, name: "Boiler Tube Replacement", code: "WP-BTR-001",
    ownerCompanyId: subA.id, ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",
    dueDate: "2026-06-10", status: "Awaiting Approval",
    description: "Replace worn boiler tubes with new high-pressure rated tubes.",
  }});

  // C1 → S1 child: BoltWorks (flange bolting)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c1s1.id, name: "Flange Bolting & Torque", code: "WP-FBT-001",
    ownerCompanyId: subB.id, ownerCompany: "BoltWorks CC", responsible: "Dave Pretorius",
    dueDate: "2026-06-05", status: "Not Started",
    description: "Torque all flange connections per spec.",
  }});

  // C1 → S2: PipeSpec (pressure testing)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c1.id, name: "Pressure Testing", code: "WP-PT-001",
    ownerCompanyId: subC.id, ownerCompany: "PipeSpec (Pty) Ltd", responsible: "Sara Dlamini",
    dueDate: "2026-06-20", status: "Not Started",
    description: "Hydrostatic and pneumatic pressure testing of all boiler circuits.",
  }});

  // C1 → S3: BoltWorks (insulation removal)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c1.id, name: "Insulation Removal & Refit", code: "WP-INS-001",
    ownerCompanyId: subB.id, ownerCompany: "BoltWorks CC", responsible: "Dave Pretorius",
    dueDate: "2026-06-25", status: "Not Started",
    description: "Strip and refit thermal insulation on boiler shell.",
  }});

  // C2: ProTech Solutions — Instrumentation scope
  const c2 = await prisma.workPackage.create({ data: {
    projectId: proj1.id, name: "Instrumentation Upgrade", code: "WP-INST-001",
    ownerCompanyId: protech.id, ownerCompany: "ProTech Solutions", responsible: "Lena Fourie",
    dueDate: "2026-07-15", status: "Not Started",
    description: "Upgrade all field instruments to smart transmitters.",
  }});

  // C2 → S1: Sub-Engineering (cable tray)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c2.id, name: "Cable Tray Installation", code: "WP-CTI-001",
    ownerCompanyId: subA.id, ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",
    dueDate: "2026-07-05", status: "Not Started",
    description: "Install cable trays and pull instrument cables.",
  }});

  // C2 → S2: PipeSpec (impulse lines)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c2.id, name: "Impulse Line Fabrication", code: "WP-ILF-001",
    ownerCompanyId: subC.id, ownerCompany: "PipeSpec (Pty) Ltd", responsible: "Sara Dlamini",
    dueDate: "2026-07-10", status: "Not Started",
    description: "Fabricate and install impulse lines for pressure transmitters.",
  }});

  // C3: Apex Mechanical — Rotating equipment
  const c3 = await prisma.workPackage.create({ data: {
    projectId: proj1.id, name: "Rotating Equipment Overhaul", code: "WP-REO-001",
    ownerCompanyId: apex.id, ownerCompany: "Apex Mechanical", responsible: "James Mokoena",
    dueDate: "2026-07-30", status: "In Progress",
    description: "Overhaul all pumps, compressors, and fans in the refinery.",
  }});

  // C3 → S1: Sub-Engineering (pump overhaul)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c3.id, name: "Pump Overhaul — Units 1-4", code: "WP-PO-001",
    ownerCompanyId: subA.id, ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",
    dueDate: "2026-07-15", status: "In Progress",
    description: "Strip, inspect, and rebuild pumps 1 through 4.",
  }});

  // C3 → S2: BoltWorks (coupling alignment)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c3.id, name: "Coupling Alignment", code: "WP-CA-001",
    ownerCompanyId: subB.id, ownerCompany: "BoltWorks CC", responsible: "Dave Pretorius",
    dueDate: "2026-07-20", status: "Not Started",
    description: "Laser alignment of all pump-motor couplings.",
  }});

  // C3 → S3: PipeSpec (lube oil lines)
  await prisma.workPackage.create({ data: {
    projectId: proj1.id, parentId: c3.id, name: "Lube Oil Line Flushing", code: "WP-LOF-001",
    ownerCompanyId: subC.id, ownerCompany: "PipeSpec (Pty) Ltd", responsible: "Sara Dlamini",
    dueDate: "2026-07-25", status: "Not Started",
    description: "Flush and recommission all lube oil systems.",
  }});

  console.log("✅ Created work packages (Project 1)");

  // ─── Work Packages — Project 2 (Equipment Installation) ──────
  const c4 = await prisma.workPackage.create({ data: {
    projectId: proj2.id, name: "Control System Installation", code: "WP-CSI-001",
    ownerCompanyId: roteq.id, ownerCompany: "Roteq Engineering", responsible: "Vindy Sharma",
    dueDate: "2026-07-20", status: "Not Started",
    description: "Install and configure new automated control systems.",
  }});

  await prisma.workPackage.create({ data: {
    projectId: proj2.id, parentId: c4.id, name: "PLC Panel Installation", code: "WP-PLC-001",
    ownerCompanyId: subA.id, ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",
    dueDate: "2026-07-10", status: "Not Started",
    description: "Mount and wire PLC panels.",
  }});

  await prisma.workPackage.create({ data: {
    projectId: proj2.id, parentId: c4.id, name: "Field Wiring & Terminations", code: "WP-FWT-001",
    ownerCompanyId: subB.id, ownerCompany: "BoltWorks CC", responsible: "Dave Pretorius",
    dueDate: "2026-07-15", status: "Not Started",
    description: "Pull and terminate all field wiring.",
  }});

  console.log("✅ Created work packages (Project 2)");

  // ─── Documents ───────────────────────────────────────────────
  await prisma.document.createMany({ data: [
    { packageId: c1.id,   title: "Boiler Inspection Report",    type: "Report",    revision: "Rev B", status: "Approved for Use", uploadedBy: "Vindy Sharma",  uploadDate: "2026-04-10", isCurrent: true,  notes: "All issues documented." },
    { packageId: c1.id,   title: "Boiler Inspection Report",    type: "Report",    revision: "Rev A", status: "Superseded",       uploadedBy: "Vindy Sharma",  uploadDate: "2026-04-08", isCurrent: false, notes: "Draft version." },
    { packageId: c1s1.id, title: "Tube Replacement Procedure",  type: "Procedure", revision: "Rev B", status: "Approved for Use", uploadedBy: "Mike Nkosi",    uploadDate: "2026-04-12", isCurrent: true,  notes: "Updated with safety requirements." },
    { packageId: c2.id,   title: "Instrument Upgrade Spec",     type: "Drawing",   revision: "Rev 1", status: "Submitted",        uploadedBy: "Lena Fourie",   uploadDate: "2026-04-14", isCurrent: true,  notes: "Ready for review." },
    { packageId: c3.id,   title: "Rotating Equipment ITP",      type: "Procedure", revision: "Rev A", status: "Approved for Use", uploadedBy: "James Mokoena", uploadDate: "2026-04-11", isCurrent: true,  notes: "Inspection test plan approved." },
  ]});
  console.log("✅ Created documents");

  // ─── Inspections ─────────────────────────────────────────────
  await prisma.inspection.createMany({ data: [
    { packageId: c1.id,   type: "Safety Inspection",  date: "2026-04-10", inspector: "Safety Officer", result: "Passed", notes: "All safety requirements met." },
    { packageId: c1s1.id, type: "Quality Inspection", date: "2026-04-13", inspector: "QA Manager",     result: "Open",   notes: "Pending material cert." },
    { packageId: c3.id,   type: "Mechanical Inspection", date: "2026-04-15", inspector: "Lead Engineer", result: "Open", notes: "Awaiting bearing inspection." },
  ]});
  console.log("✅ Created inspections");

  // ─── Issues ──────────────────────────────────────────────────
  await prisma.issue.createMany({ data: [
    { packageId: c1.id,   title: "Delayed tube delivery",         description: "Replacement tubes delayed by supplier",         severity: "Major", owner: "Vindy Sharma",  dueDate: "2026-04-20", status: "Open" },
    { packageId: c1s1.id, title: "Material certification pending", description: "Awaiting third-party material certification",   severity: "Minor", owner: "Mike Nkosi",    dueDate: "2026-04-25", status: "Open" },
    { packageId: c3.id,   title: "Bearing lead time 6 weeks",     description: "Replacement bearings on back order",            severity: "Major", owner: "James Mokoena", dueDate: "2026-04-30", status: "Open" },
  ]});
  console.log("✅ Created issues");

  // ─── Approvals ───────────────────────────────────────────────
  await prisma.approval.createMany({ data: [
    { packageId: c1.id,   objectType: "Document",  objectLabel: "Boiler Inspection Report Rev B",  submittedBy: "Vindy Sharma",  submittedDate: "2026-04-10", approver: "John Smith",    decision: "Approved", decisionDate: "2026-04-11", comments: "Approved for use." },
    { packageId: c1s1.id, objectType: "Procedure", objectLabel: "Tube Replacement Procedure Rev B", submittedBy: "Mike Nkosi",    submittedDate: "2026-04-12", approver: "John Smith",    decision: "Pending",  decisionDate: "", comments: "" },
    { packageId: c2.id,   objectType: "Drawing",   objectLabel: "Instrument Upgrade Spec Rev 1",   submittedBy: "Lena Fourie",   submittedDate: "2026-04-14", approver: "John Smith",    decision: "Pending",  decisionDate: "", comments: "" },
    { packageId: c3.id,   objectType: "Procedure", objectLabel: "Rotating Equipment ITP Rev A",    submittedBy: "James Mokoena", submittedDate: "2026-04-11", approver: "John Smith",    decision: "Approved", decisionDate: "2026-04-12", comments: "ITP approved." },
  ]});
  console.log("✅ Created approvals");

  // ─── Activity ────────────────────────────────────────────────
  await prisma.activity.createMany({ data: [
    { packageId: c1.id,   userId: user1.id, user: "Vindy Sharma",  company: "Roteq Engineering",        actionType: "Created",              objectType: "Work Package", objectLabel: "Boiler System Overhaul",         timestamp: new Date("2026-04-08") },
    { packageId: c1.id,   userId: user1.id, user: "Vindy Sharma",  company: "Roteq Engineering",        actionType: "Uploaded",             objectType: "Document",     objectLabel: "Boiler Inspection Report Rev B", timestamp: new Date("2026-04-10") },
    { packageId: c1.id,   userId: user2.id, user: "John Smith",    company: "Glencore Ltd",             actionType: "Approved",             objectType: "Document",     objectLabel: "Boiler Inspection Report Rev B", timestamp: new Date("2026-04-11") },
    { packageId: c1s1.id, userId: user1.id, user: "Vindy Sharma",  company: "Roteq Engineering",        actionType: "Created",              objectType: "Sub-package",  objectLabel: "Boiler Tube Replacement",        timestamp: new Date("2026-04-09") },
    { packageId: c2.id,   userId: user1.id, user: "Lena Fourie",   company: "ProTech Solutions",        actionType: "Created",              objectType: "Work Package", objectLabel: "Instrumentation Upgrade",        timestamp: new Date("2026-04-12") },
    { packageId: c3.id,   userId: user1.id, user: "James Mokoena", company: "Apex Mechanical",          actionType: "Created",              objectType: "Work Package", objectLabel: "Rotating Equipment Overhaul",    timestamp: new Date("2026-04-13") },
    { packageId: c3.id,   userId: user2.id, user: "John Smith",    company: "Glencore Ltd",             actionType: "Approved",             objectType: "Procedure",    objectLabel: "Rotating Equipment ITP Rev A",   timestamp: new Date("2026-04-12") },
  ]});
  console.log("✅ Created activity log");

  console.log("✨ Database seeded successfully!");
}

main()
  .catch((e) => { console.error("❌ Seeding failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
