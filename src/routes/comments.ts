import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

export const commentsRouter = Router();

commentsRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const packageId = req.query.packageId as string;
    const data = await prisma.comment.findMany({
      where: packageId ? { packageId } : {},
      orderBy: { createdAt: "desc" },
      include: { user: { select: { fullName: true } } },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

commentsRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { packageId, text } = req.body;
    const created = await prisma.comment.create({
      data: { packageId, text, userId: req.userId! },
      include: { user: { select: { fullName: true } } },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
