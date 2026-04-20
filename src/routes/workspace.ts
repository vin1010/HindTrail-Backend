import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { queryStr } from "../utils";
import { getAccessScope } from "../access";

export const workspaceRouter = Router();

// Returns pending approvals visible to the caller. Approver-name filter narrows further.
workspaceRouter.get("/notifications", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const scope = await getAccessScope(req.userId!);
    const approverName = queryStr(req.query.approver);
    const pending = await prisma.approval.findMany({
      where: {
        decision: "Pending",
        packageId: { in: [...scope.packageIds] },
        ...(approverName ? { approver: approverName } : {}),
      },
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

    const [memberships, scope] = await Promise.all([
      prisma.companyUser.findMany({
        where: { userId, status: "active" },
        include: { company: true },
      }),
      getAccessScope(userId),
    ]);

    const projectIds = [...scope.projectIds];
    const packageIdList = [...scope.packageIds];
    const pkgFilter = { packageId: { in: packageIdList } };

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      orderBy: { createdAt: "desc" },
    });

    const [openIssues, pendingApprovals, inProgressPkgs, totalPackages, closedPackages, totalDocs, pkgByStatus, recentActivity] = await Promise.all([
      prisma.issue.count({ where: { ...pkgFilter, NOT: { status: "Closed" } } }),
      prisma.approval.count({ where: { ...pkgFilter, decision: "Pending" } }),
      prisma.workPackage.count({ where: { id: { in: packageIdList }, status: "In Progress" } }),
      prisma.workPackage.count({ where: { id: { in: packageIdList } } }),
      prisma.workPackage.count({ where: { id: { in: packageIdList }, status: "Closed" } }),
      prisma.document.count({ where: pkgFilter }),
      prisma.workPackage.groupBy({
        by: ["status"],
        where: { id: { in: packageIdList } },
        _count: { id: true },
      }),
      prisma.activity.findMany({
        where: { OR: [{ packageId: null }, pkgFilter] },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
    ]);
    const packagesByStatus = Object.fromEntries(
      pkgByStatus.map((r: any) => [r.status, r._count.id])
    );

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
