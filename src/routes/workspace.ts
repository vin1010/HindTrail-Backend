import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { queryStr } from "../utils";

export const workspaceRouter = Router();

// Returns pending approvals for the given approver name or all, with package/project context
workspaceRouter.get("/notifications", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const approverName = queryStr(req.query.approver);
    const where = approverName
      ? { decision: "Pending", approver: approverName }
      : { decision: "Pending" };

    const pending = await prisma.approval.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        package: { select: { id: true, name: true, code: true, projectId: true } },
      },
    });

    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

workspaceRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const companyId = req.query.companyId as string | undefined;

    const memberships = await prisma.companyUser.findMany({
      where: { userId, status: "active" },
      include: { company: true },
    });

    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    const openIssues = await prisma.issue.count({ where: { NOT: { status: "Closed" } } });
    const pendingApprovals = await prisma.approval.count({ where: { decision: "Pending" } });
    const inProgressPkgs = await prisma.workPackage.count({ where: { status: "In Progress" } });

    const [totalPackages, closedPackages, totalDocs, pkgByStatus] = await Promise.all([
      prisma.workPackage.count(),
      prisma.workPackage.count({ where: { status: "Closed" } }),
      prisma.document.count(),
      prisma.workPackage.groupBy({ by: ["status"], _count: { id: true } }),
    ]);
    const packagesByStatus = Object.fromEntries(
      pkgByStatus.map((r: any) => [r.status, r._count.id])
    );

    const recentActivity = await prisma.activity.findMany({
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    res.json({
      activeCompanyId: companyId || memberships[0]?.companyId || null,
      companies: memberships.map((m: any) => ({
        id: m.company.id, name: m.company.name, role: m.role, type: m.company.type,
      })),
      projects,
      stats: {
        openIssues,
        pendingApprovals,
        inProgressPkgs,
        totalPackages,
        closedPackages,
        totalDocs,
        packagesByStatus,
      },
      recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
