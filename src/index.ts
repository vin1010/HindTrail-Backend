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

// Idempotent demo seed. Safe to call multiple times — creates client /
// contractor / subcontractor accounts + a single three-tier Iron Crest
// project so the live site has something credible to walk through.
// Gated by DEMO_SEED_TOKEN (falls back to a fixed dev token).
app.post("/admin/seed-demo", async (req, res) => {
  const expected = process.env.DEMO_SEED_TOKEN || "hindtrail-seed-2026";
  if (req.headers["x-seed-token"] !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const p = new PrismaClient();

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
      if (!found) await p.document.create({ data: { packageId, title, revision, ...data } });
    };
    const ensureApproval = async (packageId: string, objectLabel: string, data: any) => {
      const found = await p.approval.findFirst({ where: { packageId, objectLabel } });
      if (!found) await p.approval.create({ data: { packageId, objectLabel, ...data } });
    };
    const ensureInspection = async (packageId: string, type: string, data: any) => {
      const found = await p.inspection.findFirst({ where: { packageId, type } });
      if (!found) await p.inspection.create({ data: { packageId, type, ...data } });
    };

    const ironCrest = await findOrCreateCompany("Iron Crest Resources", "client");
    const vertex = await findOrCreateCompany("Vertex Industrial Services", "contractor");
    const subEng = await findOrCreateCompany("Sub-Engineering Solutions", "contractor");

    const emma = await upsertUser("emma@ironcrest.com", "Emma Collins");
    const michael = await upsertUser("michael@vertex.com", "Michael Reed");
    const mike = await upsertUser("mike@sub-engineering.com", "Mike Nkosi");

    await ensureMembership(emma.id, ironCrest.id, "admin");
    await ensureMembership(michael.id, vertex.id, "admin");
    await ensureMembership(mike.id, subEng.id, "admin");

    const project = await findOrCreateProject("ICSD-DEMO", {
      name: "Iron Crest Shutdown 2026 (Demo)",
      clientName: "Iron Crest Resources",
      clientCompanyId: ironCrest.id,
      location: "Pilbara, Western Australia",
      startDate: "2026-05-01",
      endDate: "2026-05-12",
      status: "Active",
      description: "12-day planned shutdown. Mechanical, structural, reliability scopes.",
    });

    const root = await findOrCreatePackage("DEMO-SP417", {
      projectId: project.id,
      name: "Slurry Pump SP-417 Rebuild & Reinstall",
      ownerCompanyId: vertex.id,
      ownerCompany: vertex.name,
      responsible: "Michael Reed",
      dueDate: "2026-05-10",
      status: "In Progress",
      description: "Rebuild and reinstall slurry pump SP-417.",
    });
    const child = await findOrCreatePackage("DEMO-MR", {
      projectId: project.id,
      parentId: root.id,
      name: "Mechanical Rebuild Package",
      ownerCompanyId: subEng.id,
      ownerCompany: subEng.name,
      responsible: "Mike Nkosi",
      dueDate: "2026-05-07",
      status: "In Progress",
      description: "Shaft, bearing, sleeve and casing rebuild.",
    });
    const grandchild = await findOrCreatePackage("DEMO-SSR", {
      projectId: project.id,
      parentId: child.id,
      name: "Shaft Sleeve Restoration",
      ownerCompanyId: subEng.id,
      ownerCompany: subEng.name,
      responsible: "Mike Nkosi",
      dueDate: "2026-05-06",
      status: "Not Started",
      description: "Sleeve coating and dimensional restoration.",
    });

    // Rollup-worthy records on the hidden tiers so parent tiers still see
    // meaningful counts (the whole point of the hybrid permission model).
    await ensureIssue(child.id, "Bearing clearance out of spec", {
      severity: "Major", owner: "Mike Nkosi", status: "Open",
      description: "Outboard bearing running above tolerance.", dueDate: "2026-05-05",
    });
    await ensureIssue(grandchild.id, "Shaft scoring deeper than expected", {
      severity: "Major", owner: "Mike Nkosi", status: "Open",
      description: "Scoring exceeds OEM allowance.", dueDate: "2026-05-04",
    });
    await ensureApproval(child.id, "Rebuild Procedure Rev B", {
      objectType: "Procedure", submittedBy: "Mike Nkosi",
      submittedDate: "2026-04-20", approver: "Michael Reed", decision: "Pending",
    });
    await ensureApproval(grandchild.id, "Sleeve Restoration Method Rev A", {
      objectType: "Procedure", submittedBy: "Mike Nkosi",
      submittedDate: "2026-04-19", approver: "Michael Reed", decision: "Pending",
    });
    await ensureDoc(child.id, "Rebuild Procedure", "Rev B", {
      type: "Procedure", status: "Approved for Use",
      uploadedBy: "Mike Nkosi", uploadDate: "2026-04-18", isCurrent: true,
    });
    await ensureDoc(grandchild.id, "Sleeve Restoration Method", "Rev A", {
      type: "Procedure", status: "Submitted",
      uploadedBy: "Mike Nkosi", uploadDate: "2026-04-17", isCurrent: true,
    });
    await ensureInspection(child.id, "Pre-strip visual inspection", {
      date: "2026-04-21", inspector: "Mike Nkosi", result: "Passed",
      notes: "Leakage residue observed near gland area.",
    });
    await ensureInspection(grandchild.id, "Sleeve dimensional check", {
      date: "2026-04-22", inspector: "Mike Nkosi", result: "Open",
      notes: "Awaiting final coating.",
    });

    await p.$disconnect();
    res.json({
      ok: true,
      demoAccounts: [
        { email: emma.email, role: "Client", company: ironCrest.name },
        { email: michael.email, role: "Contractor", company: vertex.name },
        { email: mike.email, role: "Subcontractor", company: subEng.name },
      ],
      projectCode: project.code,
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
