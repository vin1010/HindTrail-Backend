import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";
import { queryStr, paramStr } from "../utils";

export const issuesRouter = Router();

issuesRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const packageId = queryStr(req.query.packageId);
    const where = packageId ? { packageId } : {};
    const items = await prisma.issue.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(items);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

issuesRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.issue.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

issuesRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const item = await prisma.issue.update({ where: { id: paramStr(req.params.id) }, data: req.body });
    res.json(item);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
