import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

export const workspaceRouter = Router();

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
    const recentActivity = await prisma.activity.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    res.json({
      activeCompanyId: companyId || memberships[0]?.companyId || null,
      companies: memberships.map((m: any) => ({
        id: m.company.id, name: m.company.name, role: m.role, type: m.company.type,
      })),
      projects,
      stats: { openIssues, pendingApprovals, inProgressPkgs },
      recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
