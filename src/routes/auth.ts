import { Router } from "express";
import { prisma } from "../db";
import { signToken, authMiddleware, type AuthRequest } from "../middleware/auth";

export const authRouter = Router();

// POST /auth/login — MVP: email-based login (auto-creates user)
authRouter.post("/login", async (req, res) => {
  try {
    const { email, fullName, provider } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email required" });
      return;
    }

    // Upsert user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, fullName: fullName || email.split("@")[0] },
      });
    }

    // Get memberships
    const memberships = await prisma.companyUser.findMany({
      where: { userId: user.id, status: "active" },
      include: { company: true },
    });

    const token = signToken(user.id);

    const mapped = memberships.map((m) => ({
      id: m.company.id,
      name: m.company.name,
      role: m.role,
      type: m.company.type,
    }));

    let activeCompanyId: string | null = null;
    let next = "onboarding";

    if (mapped.length === 1) {
      activeCompanyId = mapped[0].id;
      next = "workspace";
    } else if (mapped.length > 1) {
      // Check last context
      const ctx = await prisma.userLastContext.findUnique({ where: { userId: user.id } });
      activeCompanyId = ctx?.lastCompanyId ?? mapped[0].id;
      next = "workspace";
    }

    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName },
      memberships: mapped,
      activeCompanyId,
      next,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /auth/context — set active company
authRouter.post("/context", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.body;
    const userId = req.userId!;

    const membership = await prisma.companyUser.findFirst({
      where: { userId, companyId, status: "active" },
    });
    if (!membership) {
      res.status(403).json({ error: "Not a member of this company" });
      return;
    }

    await prisma.userLastContext.upsert({
      where: { userId },
      update: { lastCompanyId: companyId },
      create: { userId, lastCompanyId: companyId },
    });

    res.json({ activeCompanyId: companyId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /auth/onboarding/create-company
authRouter.post("/onboarding/create-company", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, type } = req.body;
    const userId = req.userId!;

    const company = await prisma.company.create({
      data: { name, type: type || "contractor" },
    });

    await prisma.companyUser.create({
      data: { userId, companyId: company.id, role: "admin", status: "active" },
    });

    res.json({ companyId: company.id, next: "workspace" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /auth/onboarding/independent
authRouter.post("/onboarding/independent", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { displayName } = req.body;
    const userId = req.userId!;

    const company = await prisma.company.create({
      data: { name: `${displayName} (Independent)`, type: "independent" },
    });

    await prisma.companyUser.create({
      data: { userId, companyId: company.id, role: "admin", status: "active" },
    });

    res.json({ companyId: company.id, next: "workspace" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
