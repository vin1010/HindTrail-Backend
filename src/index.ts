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
import { contractorsRouter } from "./routes/contractors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "HindTrail API" });
});

// Idempotent demo seed. Populates the live DB with the Acme Mining "Alpha
// Plant Upgrade" project — a realistic four-tier contractor chain with
// docs, inspections, issues, approvals, and sample chat messages. Safe to
// call multiple times (find-or-create semantics on every entity).
// Gated by DEMO_SEED_TOKEN (defaults to a fixed dev token).
app.post("/admin/seed-demo", async (req, res) => {
  const expected = process.env.DEMO_SEED_TOKEN || "hindtrail-seed-2026";
  if (req.headers["x-seed-token"] !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const p = new PrismaClient();

    // ── Idempotent helpers ─────────────────────────────────────────────
    const findOrCreateCompany = async (name: string, type: string) => {
      const found = await p.company.findFirst({ where: { name } });
      return found ?? p.company.create({ data: { name, type } });
    };
    const upsertUser = (email: string, fullName: string) =>
      p.user.upsert({ where: { email }, update: {}, create: { email, fullName } });
    const ensureMembership = (userId: string, companyId: string, role: string) =>
      p.companyUser.upsert({
        where: { userId_companyId: { userId, companyId } },
        update: { role, status: "active" },
        create: { userId, companyId, role, status: "active" },
      });
    const findOrCreateProject = async (code: string, data: any) => {
      const found = await p.project.findFirst({ where: { code } });
      return found ?? p.project.create({ data: { code, ...data } });
    };
    const findOrCreatePackage = async (code: string, data: any) => {
      const found = await p.workPackage.findFirst({ where: { code } });
      return found ?? p.workPackage.create({ data: { code, ...data } });
    };
    const ensureIssue = async (packageId: string, title: string, data: any) => {
      const found = await p.issue.findFirst({ where: { packageId, title } });
      if (!found) await p.issue.create({ data: { packageId, title, ...data } });
    };
    const ensureDoc = async (packageId: string, title: string, revision: string, data: any) => {
      const found = await p.document.findFirst({ where: { packageId, title, revision } });
      if (!found) {
        await p.document.create({ data: { packageId, title, revision, ...data } });
      } else if (data.fileUrl && !found.fileUrl) {
        // Backfill fileUrl on previously-seeded rows so the demo links work.
        await p.document.update({ where: { id: found.id }, data: { fileUrl: data.fileUrl } });
      }
    };
    const ensureApproval = async (packageId: string, objectLabel: string, data: any) => {
      const found = await p.approval.findFirst({ where: { packageId, objectLabel } });
      if (!found) await p.approval.create({ data: { packageId, objectLabel, ...data } });
    };
    const ensureInspection = async (packageId: string, type: string, data: any) => {
      const found = await p.inspection.findFirst({ where: { packageId, type } });
      if (!found) await p.inspection.create({ data: { packageId, type, ...data } });
    };
    const ensureComment = async (packageId: string, userId: string, text: string, createdAt: Date) => {
      const found = await p.comment.findFirst({ where: { packageId, userId, text } });
      if (!found) await p.comment.create({ data: { packageId, userId, text, createdAt } });
    };
    const ensureActivity = async (packageId: string, userId: string, actionType: string, objectLabel: string, data: any) => {
      const found = await p.activity.findFirst({ where: { packageId, userId, actionType, objectLabel } });
      if (!found) await p.activity.create({ data: { packageId, userId, actionType, objectLabel, ...data } });
    };

    // ── Companies ──────────────────────────────────────────────────────
    const acme = await findOrCreateCompany("Acme Mining Pty Ltd", "client");
    const ironBuild = await findOrCreateCompany("IronBuild Construction", "contractor");
    const voltEdge = await findOrCreateCompany("VoltEdge Electrical", "contractor");
    const pipePro = await findOrCreateCompany("PipePro Mechanical", "contractor");
    const skyScaff = await findOrCreateCompany("SkyScaff Services", "contractor");
    const liftSafe = await findOrCreateCompany("LiftSafe Rigging", "contractor");
    const weldRight = await findOrCreateCompany("WeldRight Mobile Welding", "contractor");
    const cableTag = await findOrCreateCompany("CableTag QA Services", "contractor");

    // ── Users (names match the Acme Mining demo dataset) ───────────────
    const asha = await upsertUser("asha.verma@cli-001.example", "Asha Verma");       // Client PM
    const michaelT = await upsertUser("michael.tan@cli-001.example", "Michael Tan"); // Client Rep
    const priya = await upsertUser("priya.nair@cli-001.example", "Priya Nair");      // Client QA
    const ben = await upsertUser("ben.hughes@cli-001.example", "Ben Hughes");        // Client HSE

    const ethan = await upsertUser("ethan.miller@con-001.example", "Ethan Miller");   // IronBuild PM
    const kiran = await upsertUser("kiran.rao@con-001.example", "Kiran Rao");         // IronBuild Supervisor
    const hannah = await upsertUser("hannah.jones@con-001.example", "Hannah Jones");  // IronBuild DocCtrl

    const ravi = await upsertUser("ravi.sharma@con-002.example", "Ravi Sharma");      // VoltEdge PM
    const ibrahim = await upsertUser("ibrahim.khan@con-002.example", "Ibrahim Khan"); // VoltEdge QA/QC

    const jack = await upsertUser("jack.evans@con-003.example", "Jack Evans");        // PipePro PM
    const luke = await upsertUser("luke.walker@con-003.example", "Luke Walker");      // PipePro QA/QC

    const dylan = await upsertUser("dylan.scott@sub-001.example", "Dylan Scott");     // SkyScaff Supervisor
    const chloe = await upsertUser("chloe.king@sub-002.example", "Chloe King");       // LiftSafe Supervisor
    const wei = await upsertUser("wei.zhang@ssub-001.example", "Wei Zhang");          // WeldRight Supervisor
    const anika = await upsertUser("anika.das@ssub-002.example", "Anika Das");        // CableTag Inspector

    // Memberships — one admin per company, plus a couple of regulars
    await ensureMembership(asha.id, acme.id, "admin");
    await ensureMembership(michaelT.id, acme.id, "member");
    await ensureMembership(priya.id, acme.id, "member");
    await ensureMembership(ben.id, acme.id, "member");
    await ensureMembership(ethan.id, ironBuild.id, "admin");
    await ensureMembership(kiran.id, ironBuild.id, "member");
    await ensureMembership(hannah.id, ironBuild.id, "member");
    await ensureMembership(ravi.id, voltEdge.id, "admin");
    await ensureMembership(ibrahim.id, voltEdge.id, "member");
    await ensureMembership(jack.id, pipePro.id, "admin");
    await ensureMembership(luke.id, pipePro.id, "member");
    await ensureMembership(dylan.id, skyScaff.id, "admin");
    await ensureMembership(chloe.id, liftSafe.id, "admin");
    await ensureMembership(wei.id, weldRight.id, "admin");
    await ensureMembership(anika.id, cableTag.id, "admin");

    // ── Project ────────────────────────────────────────────────────────
    const project = await findOrCreateProject("HT-ALPHA-001", {
      name: "Alpha Plant Upgrade",
      clientName: "Acme Mining Pty Ltd",
      clientCompanyId: acme.id,
      location: "Pilbara, Western Australia",
      startDate: "2025-11-01",
      endDate: "2026-06-30",
      status: "Active",
      description: "Plant-wide civil, electrical, and mechanical upgrade. Multi-tier contractor chain with full evidence capture.",
    });

    // ── Package tree (3 roots → 2 subs → 2 sub-subs) ───────────────────
    // Roots = contractors directly under the client
    const civilNode = await findOrCreatePackage("NODE-CON-001", {
      projectId: project.id,
      name: "Civil & Foundations — Area A",
      ownerCompanyId: ironBuild.id,
      ownerCompany: ironBuild.name,
      responsible: "Ethan Miller",
      dueDate: "2026-01-31",
      status: "In Progress",
      description: "Concrete pads and foundations for equipment skids. Civil site prep and set-out.",
    });
    const elecNode = await findOrCreatePackage("NODE-CON-002", {
      projectId: project.id,
      name: "Electrical — Area B",
      ownerCompanyId: voltEdge.id,
      ownerCompany: voltEdge.name,
      responsible: "Ravi Sharma",
      dueDate: "2026-03-15",
      status: "In Progress",
      description: "Install cable trays and pull power/control cables to MCC.",
    });
    const mechNode = await findOrCreatePackage("NODE-CON-003", {
      projectId: project.id,
      name: "Piping & Mechanical — Area C",
      ownerCompanyId: pipePro.id,
      ownerCompany: pipePro.name,
      responsible: "Jack Evans",
      dueDate: "2026-04-10",
      status: "In Progress",
      description: "Fabrication and install of piping spools, hydrotest pack, flange sets.",
    });

    // Subs (children of contractor roots)
    const scaffNode = await findOrCreatePackage("NODE-SUB-001", {
      projectId: project.id,
      parentId: civilNode.id,
      name: "Scaffolding Access",
      ownerCompanyId: skyScaff.id,
      ownerCompany: skyScaff.name,
      responsible: "Dylan Scott",
      dueDate: "2026-02-28",
      status: "In Progress",
      description: "Temporary scaffolding access for civil and downstream disciplines.",
    });
    const liftNode = await findOrCreatePackage("NODE-SUB-002", {
      projectId: project.id,
      parentId: elecNode.id,
      name: "Heavy Lifts & Rigging",
      ownerCompanyId: liftSafe.id,
      ownerCompany: liftSafe.name,
      responsible: "Chloe King",
      dueDate: "2026-02-15",
      status: "In Progress",
      description: "MCC skid placement and critical lifts for electrical scope.",
    });

    // Sub-subs (grandchildren — invisible to client + root contractor)
    const weldNode = await findOrCreatePackage("NODE-SSUB-001", {
      projectId: project.id,
      parentId: scaffNode.id,
      name: "Mobile Welding Services",
      ownerCompanyId: weldRight.id,
      ownerCompany: weldRight.name,
      responsible: "Wei Zhang",
      dueDate: "2026-02-20",
      status: "In Progress",
      description: "On-site hot work and repair welding as called by scaffolding crew.",
    });
    const qaNode = await findOrCreatePackage("NODE-SSUB-002", {
      projectId: project.id,
      parentId: liftNode.id,
      name: "Cable QA & Testing",
      ownerCompanyId: cableTag.id,
      ownerCompany: cableTag.name,
      responsible: "Anika Das",
      dueDate: "2026-03-10",
      status: "In Progress",
      description: "Independent cable tag + termination QA for VoltEdge scope.",
    });

    // ── Documents (currently-issued drawings & procedures) ─────────────
    // Public sample PDFs so download links work in the demo even before
    // Cloudinary is configured. Replace with real uploads when credentialed.
    const SAMPLE_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    await ensureDoc(civilNode.id, "IFC Civil Drawings Pack", "Rev B", {
      type: "Drawing", status: "Approved for Use",
      uploadedBy: "Ethan Miller", uploadDate: "2026-01-18", isCurrent: true,
      notes: "Updated layout; client comments incorporated.",
      fileUrl: SAMPLE_PDF,
    });
    await ensureDoc(civilNode.id, "IFC Civil Drawings Pack", "Rev A", {
      type: "Drawing", status: "Superseded",
      uploadedBy: "Ethan Miller", uploadDate: "2026-01-05", isCurrent: false,
      notes: "Initial issue.",
      fileUrl: SAMPLE_PDF,
    });
    await ensureDoc(elecNode.id, "ITP — Electrical Cable Works", "Rev B", {
      type: "Procedure", status: "Issued",
      uploadedBy: "Ibrahim Khan", uploadDate: "2026-01-18", isCurrent: true,
      notes: "Inspection test plan for cable pulls and terminations.",
      fileUrl: SAMPLE_PDF,
    });
    await ensureDoc(liftNode.id, "Lift Plan — MCC Skid", "Rev A", {
      type: "Procedure", status: "Approved for Use",
      uploadedBy: "Chloe King", uploadDate: "2026-01-05", isCurrent: true,
      notes: "Approved critical lift plan.",
      fileUrl: SAMPLE_PDF,
    });
    await ensureDoc(mechNode.id, "Hydrotest Pack — Line C1", "Rev A", {
      type: "Procedure", status: "Draft",
      uploadedBy: "Jack Evans", uploadDate: "2026-01-12", isCurrent: true,
      notes: "Pending client review.",
      fileUrl: SAMPLE_PDF,
    });

    // ── Inspections ────────────────────────────────────────────────────
    await ensureInspection(civilNode.id, "Concrete Pour Inspection", {
      date: "2025-11-29", inspector: "Kiran Rao", result: "Passed",
      notes: "Hold point satisfied with client witness.",
    });
    await ensureInspection(scaffNode.id, "Scaffold Handover / Tag", {
      date: "2025-12-10", inspector: "Dylan Scott", result: "Passed",
      notes: "Minor observations recorded.",
    });
    await ensureInspection(elecNode.id, "Tray Supports Inspection", {
      date: "2025-12-19", inspector: "Ibrahim Khan", result: "Passed",
      notes: "Hold point satisfied with client witness.",
    });
    await ensureInspection(liftNode.id, "Critical Lift Witness", {
      date: "2026-01-15", inspector: "Priya Nair", result: "Passed",
      notes: "All checks passed. Lift proceeded under Chloe King.",
    });
    await ensureInspection(mechNode.id, "Materials Receiving Inspection", {
      date: "2025-12-15", inspector: "Luke Walker", result: "Failed",
      notes: "Packing list mismatch; QA docs incomplete for 2 spools.",
    });

    // ── Issues (mapped from xlsx) ──────────────────────────────────────
    await ensureIssue(qaNode.id, "Weather impacts workfront", {
      severity: "Major", owner: "Anika Das", status: "Open",
      description: "Heavy rain Monday onward; terminations deferred.", dueDate: "2026-01-27",
    });
    await ensureIssue(mechNode.id, "Weather impacts workfront", {
      severity: "Major", owner: "Sara Ali", status: "Open",
      description: "Awaiting client sign-off on weather-adjusted hydrotest window.", dueDate: "2026-01-31",
    });
    await ensureIssue(weldNode.id, "Permit pending approval", {
      severity: "Minor", owner: "Wei Zhang", status: "Open",
      description: "Hot work permit pending HSE sign-off.", dueDate: "2026-02-14",
    });
    await ensureIssue(mechNode.id, "QA documentation incomplete", {
      severity: "Minor", owner: "Luke Walker", status: "Open",
      description: "Missing material certs for spool batch 1.", dueDate: "2026-01-31",
    });
    await ensureIssue(scaffNode.id, "QA documentation incomplete", {
      severity: "Minor", owner: "Dylan Scott", status: "Open",
      description: "Scaffolding tag register partial.", dueDate: "2026-02-07",
    });
    await ensureIssue(civilNode.id, "Material delivery delayed", {
      severity: "Minor", owner: "Kiran Rao", status: "Open",
      description: "Rebar shipment delayed 5 days.", dueDate: "2026-02-07",
    });
    await ensureIssue(civilNode.id, "IFC drawing clarification required", {
      severity: "Major", owner: "Ethan Miller", status: "Closed",
      closureNotes: "RFI answered; Rev B issued.",
      description: "Clarification on anchor set-out.", dueDate: "2026-01-22",
    });
    await ensureIssue(weldNode.id, "QA documentation incomplete", {
      severity: "Major", owner: "Wei Zhang", status: "Open",
      description: "Weld procedure qualification record missing.", dueDate: "2026-01-31",
    });

    // ── Approvals ──────────────────────────────────────────────────────
    await ensureApproval(civilNode.id, "IFC Civil Drawings Pack Rev B", {
      objectType: "Drawing", submittedBy: "Ethan Miller",
      submittedDate: "2026-01-18", approver: "Priya Nair",
      decision: "Approved", decisionDate: "2026-01-19",
      comments: "Approved for use.",
    });
    await ensureApproval(elecNode.id, "ITP — Electrical Cable Works Rev B", {
      objectType: "Procedure", submittedBy: "Ibrahim Khan",
      submittedDate: "2026-01-18", approver: "Asha Verma",
      decision: "Approved", decisionDate: "2026-01-19",
      comments: "Approved for use.",
    });
    await ensureApproval(liftNode.id, "Lift Plan — MCC Skid Rev A", {
      objectType: "Procedure", submittedBy: "Chloe King",
      submittedDate: "2026-01-05", approver: "Asha Verma",
      decision: "Approved", decisionDate: "2026-01-06",
      comments: "Approved for use.",
    });
    await ensureApproval(mechNode.id, "Hydrotest Pack — Line C1 Rev A", {
      objectType: "Procedure", submittedBy: "Jack Evans",
      submittedDate: "2026-01-12", approver: "Priya Nair",
      decision: "Pending",
    });

    // ── Comments (sample chat from xlsx Messages) ──────────────────────
    await ensureComment(civilNode.id, hannah.id,
      "Latest drawing in Doc Control is Rev B uploaded yesterday. Please use CIV-A2-ANCH-IFC Rev B.",
      new Date("2025-12-02T11:28:53"));
    await ensureComment(civilNode.id, wei.id,  // sub-sub commenting on root is not realistic in prod; but test data
      "Blocked pending as-built request from client. Can we proceed with provisional points?",
      new Date("2025-12-18T08:25:43"));
    await ensureComment(elecNode.id, ibrahim.id,
      "Please upload today's site photos to the node folder.",
      new Date("2025-12-13T12:57:34"));
    await ensureComment(elecNode.id, ravi.id,
      "Updated schedule shared; check your assigned tasks.",
      new Date("2025-12-16T10:44:50"));
    await ensureComment(scaffNode.id, priya.id,
      "Can we get a quick ETA on the replacement part?",
      new Date("2025-12-07T02:20:48"));
    await ensureComment(scaffNode.id, dylan.id,
      "Please upload today's site photos to the node folder.",
      new Date("2025-12-13T12:15:09"));
    await ensureComment(qaNode.id, anika.id,
      "Confirm permit number and validity before starting work.",
      new Date("2025-12-08T10:37:26"));
    await ensureComment(mechNode.id, jack.id,
      "Hydrotest pack Rev A uploaded for client review.",
      new Date("2026-01-12T09:15:00"));
    await ensureComment(liftNode.id, chloe.id,
      "Critical lift completed successfully. Witness signed off.",
      new Date("2026-01-15T14:22:00"));

    // ── Activity (audit trail highlights) ──────────────────────────────
    await ensureActivity(civilNode.id, asha.id, "Created", "Alpha Plant Upgrade",
      { user: "Asha Verma", company: acme.name, objectType: "Project", timestamp: new Date("2025-11-01T09:00:00") });
    await ensureActivity(civilNode.id, ethan.id, "Created", "Civil & Foundations — Area A",
      { user: "Ethan Miller", company: ironBuild.name, objectType: "Work Package", timestamp: new Date("2025-11-05T10:30:00") });
    await ensureActivity(civilNode.id, priya.id, "Approved", "IFC Civil Drawings Pack Rev B",
      { user: "Priya Nair", company: acme.name, objectType: "Document", timestamp: new Date("2026-01-19T13:30:00") });
    await ensureActivity(elecNode.id, ravi.id, "Created", "Electrical — Area B",
      { user: "Ravi Sharma", company: voltEdge.name, objectType: "Work Package", timestamp: new Date("2025-11-05T11:15:00") });
    await ensureActivity(liftNode.id, priya.id, "Passed", "Critical Lift Witness",
      { user: "Priya Nair", company: acme.name, objectType: "Inspection", timestamp: new Date("2026-01-15T14:22:00") });
    await ensureActivity(mechNode.id, luke.id, "Failed", "Materials Receiving Inspection",
      { user: "Luke Walker", company: pipePro.name, objectType: "Inspection", timestamp: new Date("2025-12-15T16:00:00") });

    await p.$disconnect();
    res.json({
      ok: true,
      summary: {
        companies: 8,
        users: 15,
        project: project.code,
        packages: 7,
        documents: 5,
        inspections: 5,
        issues: 8,
        approvals: 4,
        comments: 9,
      },
      loginAccounts: [
        { email: asha.email, role: "Client PM", company: acme.name },
        { email: ethan.email, role: "Contractor PM", company: ironBuild.name },
        { email: dylan.email, role: "Subcontractor Supervisor", company: skyScaff.name },
        { email: wei.email, role: "Sub-sub Welding Supervisor", company: weldRight.name },
      ],
    });
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
app.use("/contractors", contractorsRouter);

app.listen(PORT, () => {
  console.log(`HindTrail API running on port ${PORT}`);
});
