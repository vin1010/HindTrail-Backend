import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";
import { queryStr, paramStr } from "../utils";

export const documentsRouter = Router();

documentsRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const packageId = queryStr(req.query.packageId);
    const where = packageId ? { packageId } : {};
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(docs);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

documentsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const doc = await prisma.document.create({ data: req.body });
    if (doc.isCurrent) {
      await prisma.document.updateMany({
        where: { packageId: doc.packageId, title: doc.title, id: { not: doc.id } },
        data: { isCurrent: false, status: "Superseded" },
      });
    }
    res.status(201).json(doc);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

documentsRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await prisma.document.update({ where: { id: paramStr(req.params.id) }, data: req.body });
    res.json(doc);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
