import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../middleware/auth";
import { paramStr } from "../utils";

export const projectsRouter = Router();

projectsRouter.get("/", authMiddleware, async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    res.json(projects);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

projectsRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: paramStr(req.params.id) } });
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    res.json(project);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

projectsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, code, clientName, location, startDate, endDate, description } = req.body;
    const project = await prisma.project.create({
      data: { name, code, clientName: clientName || "", location: location || "", startDate: startDate || "", endDate: endDate || "", description: description || "" },
    });
    res.status(201).json(project);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

projectsRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await prisma.project.update({ where: { id: paramStr(req.params.id) }, data: req.body });
    res.json(project);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
