import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { projectsRouter } from "./routes/projects";
import { packagesRouter } from "./routes/packages";
import { documentsRouter } from "./routes/documents";
import { inspectionsRouter } from "./routes/inspections";
import { issuesRouter } from "./routes/issues";
import { approvalsRouter } from "./routes/approvals";
import { activityRouter } from "./routes/activity";
import { membersRouter } from "./routes/members";
import { workspaceRouter } from "./routes/workspace";
import { commentsRouter } from "./routes/comments";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "HindTrail API" });
});

// Temporary seed endpoint — remove after use
app.post("/admin/seed", async (req, res) => {
  if (req.headers["x-seed-token"] !== "hindtrail-seed-2026") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const p = new PrismaClient();
    await p.activity.deleteMany(); await p.approval.deleteMany(); await p.issue.deleteMany();
    await p.inspection.deleteMany(); await p.document.deleteMany(); await p.workPackage.deleteMany();
    await p.project.deleteMany(); await p.companyUser.deleteMany(); await p.userLastContext.deleteMany();
    await p.company.deleteMany(); await p.user.deleteMany();

    const u1 = await p.user.create({ data: { email: "vindy@roteq.co.za", fullName: "Vindy Sharma" } });
    const u2 = await p.user.create({ data: { email: "john@glencore.com", fullName: "John Smith" } });
    const glencore = await p.company.create({ data: { name: "Glencore Ltd", type: "client" } });
    const sasolOil = await p.company.create({ data: { name: "SasolOil", type: "client" } });
    const roteq    = await p.company.create({ data: { name: "Roteq Engineering", type: "contractor" } });
    const protech  = await p.company.create({ data: { name: "ProTech Solutions", type: "contractor" } });
    const apex     = await p.company.create({ data: { name: "Apex Mechanical", type: "contractor" } });
    const subA     = await p.company.create({ data: { name: "Sub-Engineering Solutions", type: "contractor" } });
    const subB     = await p.company.create({ data: { name: "BoltWorks CC", type: "contractor" } });
    const subC     = await p.company.create({ data: { name: "PipeSpec (Pty) Ltd", type: "contractor" } });
    await p.companyUser.createMany({ data: [
      { userId: u1.id, companyId: roteq.id,   role: "admin", status: "active" },
      { userId: u2.id, companyId: glencore.id, role: "admin", status: "active" },
    ]});
    const proj1 = await p.project.create({ data: { name: "Refinery Turnaround 2026", code: "RT-2026", clientName: "Glencore", clientCompanyId: glencore.id, location: "Secunda, South Africa", startDate: "2026-04-15", endDate: "2026-08-30", status: "Active", description: "Major turnaround maintenance and equipment replacement." }});
    const proj2 = await p.project.create({ data: { name: "Equipment Installation Phase 2", code: "EIP-2026", clientName: "SasolOil", clientCompanyId: sasolOil.id, location: "Sasolburg, South Africa", startDate: "2026-05-01", endDate: "2026-09-15", status: "Active", description: "Installation of new production equipment and automation systems." }});

    const c1    = await p.workPackage.create({ data: { projectId: proj1.id, name: "Boiler System Overhaul",       code: "WP-BS-001",   ownerCompanyId: roteq.id,    ownerCompany: "Roteq Engineering",        responsible: "Vindy Sharma",  dueDate: "2026-06-30", status: "In Progress",      description: "Complete overhaul of boiler systems." }});
    const c1s1  = await p.workPackage.create({ data: { projectId: proj1.id, parentId: c1.id,   name: "Boiler Tube Replacement",    code: "WP-BTR-001",  ownerCompanyId: subA.id,    ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",    dueDate: "2026-06-10", status: "Awaiting Approval", description: "Replace worn boiler tubes." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c1s1.id, name: "Flange Bolting & Torque",     code: "WP-FBT-001",  ownerCompanyId: subB.id,    ownerCompany: "BoltWorks CC",              responsible: "Dave Pretorius", dueDate: "2026-06-05", status: "Not Started",      description: "Torque all flange connections." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c1.id,   name: "Pressure Testing",           code: "WP-PT-001",   ownerCompanyId: subC.id,    ownerCompany: "PipeSpec (Pty) Ltd",        responsible: "Sara Dlamini",  dueDate: "2026-06-20", status: "Not Started",      description: "Hydrostatic pressure testing." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c1.id,   name: "Insulation Removal & Refit", code: "WP-INS-001",  ownerCompanyId: subB.id,    ownerCompany: "BoltWorks CC",              responsible: "Dave Pretorius", dueDate: "2026-06-25", status: "Not Started",      description: "Strip and refit thermal insulation." }});

    const c2 = await p.workPackage.create({ data: { projectId: proj1.id, name: "Instrumentation Upgrade",    code: "WP-INST-001", ownerCompanyId: protech.id,  ownerCompany: "ProTech Solutions",        responsible: "Lena Fourie",   dueDate: "2026-07-15", status: "Not Started",      description: "Upgrade all field instruments." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c2.id, name: "Cable Tray Installation",    code: "WP-CTI-001",  ownerCompanyId: subA.id,    ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",    dueDate: "2026-07-05", status: "Not Started",      description: "Install cable trays." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c2.id, name: "Impulse Line Fabrication",   code: "WP-ILF-001",  ownerCompanyId: subC.id,    ownerCompany: "PipeSpec (Pty) Ltd",        responsible: "Sara Dlamini",  dueDate: "2026-07-10", status: "Not Started",      description: "Fabricate impulse lines." }});

    const c3 = await p.workPackage.create({ data: { projectId: proj1.id, name: "Rotating Equipment Overhaul", code: "WP-REO-001", ownerCompanyId: apex.id,    ownerCompany: "Apex Mechanical",          responsible: "James Mokoena", dueDate: "2026-07-30", status: "In Progress",      description: "Overhaul all rotating equipment." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c3.id, name: "Pump Overhaul — Units 1-4",  code: "WP-PO-001",  ownerCompanyId: subA.id,    ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",    dueDate: "2026-07-15", status: "In Progress",      description: "Strip and rebuild pumps 1-4." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c3.id, name: "Coupling Alignment",         code: "WP-CA-001",  ownerCompanyId: subB.id,    ownerCompany: "BoltWorks CC",              responsible: "Dave Pretorius", dueDate: "2026-07-20", status: "Not Started",      description: "Laser alignment of couplings." }});
    await p.workPackage.create({ data: { projectId: proj1.id, parentId: c3.id, name: "Lube Oil Line Flushing",     code: "WP-LOF-001", ownerCompanyId: subC.id,    ownerCompany: "PipeSpec (Pty) Ltd",        responsible: "Sara Dlamini",  dueDate: "2026-07-25", status: "Not Started",      description: "Flush and recommission lube oil systems." }});

    const c4 = await p.workPackage.create({ data: { projectId: proj2.id, name: "Control System Installation",  code: "WP-CSI-001", ownerCompanyId: roteq.id,   ownerCompany: "Roteq Engineering",        responsible: "Vindy Sharma",  dueDate: "2026-07-20", status: "Not Started",      description: "Install and configure control systems." }});
    await p.workPackage.create({ data: { projectId: proj2.id, parentId: c4.id, name: "PLC Panel Installation",     code: "WP-PLC-001", ownerCompanyId: subA.id,    ownerCompany: "Sub-Engineering Solutions", responsible: "Mike Nkosi",    dueDate: "2026-07-10", status: "Not Started",      description: "Mount and wire PLC panels." }});
    await p.workPackage.create({ data: { projectId: proj2.id, parentId: c4.id, name: "Field Wiring & Terminations",code: "WP-FWT-001", ownerCompanyId: subB.id,    ownerCompany: "BoltWorks CC",              responsible: "Dave Pretorius", dueDate: "2026-07-15", status: "Not Started",      description: "Pull and terminate all field wiring." }});

    await p.document.createMany({ data: [
      { packageId: c1.id,   title: "Boiler Inspection Report",   type: "Report",    revision: "Rev B", status: "Approved for Use", uploadedBy: "Vindy Sharma",  uploadDate: "2026-04-10", isCurrent: true,  notes: "All issues documented." },
      { packageId: c1.id,   title: "Boiler Inspection Report",   type: "Report",    revision: "Rev A", status: "Superseded",       uploadedBy: "Vindy Sharma",  uploadDate: "2026-04-08", isCurrent: false, notes: "Draft." },
      { packageId: c1s1.id, title: "Tube Replacement Procedure", type: "Procedure", revision: "Rev B", status: "Approved for Use", uploadedBy: "Mike Nkosi",    uploadDate: "2026-04-12", isCurrent: true,  notes: "Updated with safety requirements." },
      { packageId: c2.id,   title: "Instrument Upgrade Spec",    type: "Drawing",   revision: "Rev 1", status: "Submitted",        uploadedBy: "Lena Fourie",   uploadDate: "2026-04-14", isCurrent: true,  notes: "Ready for review." },
      { packageId: c3.id,   title: "Rotating Equipment ITP",     type: "Procedure", revision: "Rev A", status: "Approved for Use", uploadedBy: "James Mokoena", uploadDate: "2026-04-11", isCurrent: true,  notes: "ITP approved." },
    ]});
    await p.inspection.createMany({ data: [
      { packageId: c1.id,   type: "Safety Inspection",    date: "2026-04-10", inspector: "Safety Officer", result: "Passed", notes: "All safety requirements met." },
      { packageId: c1s1.id, type: "Quality Inspection",   date: "2026-04-13", inspector: "QA Manager",     result: "Open",   notes: "Pending material cert." },
      { packageId: c3.id,   type: "Mechanical Inspection",date: "2026-04-15", inspector: "Lead Engineer",  result: "Open",   notes: "Awaiting bearing inspection." },
    ]});
    await p.issue.createMany({ data: [
      { packageId: c1.id,   title: "Delayed tube delivery",          severity: "Major", owner: "Vindy Sharma",  dueDate: "2026-04-20", status: "Open", description: "Replacement tubes delayed." },
      { packageId: c1s1.id, title: "Material certification pending", severity: "Minor", owner: "Mike Nkosi",    dueDate: "2026-04-25", status: "Open", description: "Awaiting third-party cert." },
      { packageId: c3.id,   title: "Bearing lead time 6 weeks",      severity: "Major", owner: "James Mokoena", dueDate: "2026-04-30", status: "Open", description: "Bearings on back order." },
    ]});
    await p.approval.createMany({ data: [
      { packageId: c1.id,   objectType: "Document",  objectLabel: "Boiler Inspection Report Rev B",  submittedBy: "Vindy Sharma",  submittedDate: "2026-04-10", approver: "John Smith", decision: "Approved", decisionDate: "2026-04-11", comments: "Approved." },
      { packageId: c1s1.id, objectType: "Procedure", objectLabel: "Tube Replacement Procedure Rev B", submittedBy: "Mike Nkosi",    submittedDate: "2026-04-12", approver: "John Smith", decision: "Pending",  decisionDate: "", comments: "" },
      { packageId: c3.id,   objectType: "Procedure", objectLabel: "Rotating Equipment ITP Rev A",    submittedBy: "James Mokoena", submittedDate: "2026-04-11", approver: "John Smith", decision: "Approved", decisionDate: "2026-04-12", comments: "ITP approved." },
    ]});
    await p.activity.createMany({ data: [
      { packageId: c1.id,   userId: u1.id, user: "Vindy Sharma",  company: "Roteq Engineering", actionType: "Created",  objectType: "Work Package", objectLabel: "Boiler System Overhaul",         timestamp: new Date("2026-04-08") },
      { packageId: c1.id,   userId: u2.id, user: "John Smith",    company: "Glencore Ltd",       actionType: "Approved", objectType: "Document",     objectLabel: "Boiler Inspection Report Rev B", timestamp: new Date("2026-04-11") },
      { packageId: c1s1.id, userId: u1.id, user: "Vindy Sharma",  company: "Roteq Engineering", actionType: "Created",  objectType: "Sub-package",  objectLabel: "Boiler Tube Replacement",        timestamp: new Date("2026-04-09") },
      { packageId: c3.id,   userId: u1.id, user: "James Mokoena", company: "Apex Mechanical",   actionType: "Created",  objectType: "Work Package", objectLabel: "Rotating Equipment Overhaul",    timestamp: new Date("2026-04-13") },
    ]});
    await p.$disconnect();
    res.json({ ok: true, message: "Database seeded successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Routes
app.use("/auth", authRouter);
app.use("/workspace", workspaceRouter);
app.use("/projects", projectsRouter);
app.use("/packages", packagesRouter);
app.use("/documents", documentsRouter);
app.use("/inspections", inspectionsRouter);
app.use("/issues", issuesRouter);
app.use("/approvals", approvalsRouter);
app.use("/activity", activityRouter);
app.use("/members", membersRouter);
app.use("/comments", commentsRouter);

app.listen(PORT, () => {
  console.log(`HindTrail API running on port ${PORT}`);
});
