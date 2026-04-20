import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { paramStr } from "../utils";
import { getAccessScope } from "../access";

export const projectsRouter = Router();

projectsRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const scope = await getAccessScope(req.userId!);
    const projects = await prisma.project.findMany({
      where: { id: { in: [...scope.projectIds] } },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

projectsRouter.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = paramStr(req.params.id);
    const scope = await getAccessScope(req.userId!);
    if (!scope.projectIds.has(id)) { res.status(403).json({ error: "Forbidden" }); return; }
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    res.json(project);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

projectsRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, code, clientName, clientCompanyId, location, startDate, endDate, description } = req.body;
    const scope = await getAccessScope(req.userId!);
    // Pin the project to a client company the user belongs to.
    const resolvedClientId = clientCompanyId && scope.companyIds.includes(clientCompanyId)
      ? clientCompanyId
      : scope.companyIds[0];
    if (!resolvedClientId) {
      res.status(403).json({ error: "User is not a member of any company" });
      return;
    }
    const project = await prisma.project.create({
      data: {
        name,
        code,
        clientName: clientName || "",
        clientCompanyId: resolvedClientId,
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || "",
        description: description || "",
      },
    });
    res.status(201).json(project);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});

projectsRouter.patch("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = paramStr(req.params.id);
    const scope = await getAccessScope(req.userId!);
    if (!scope.isClientOfProject(id)) { res.status(403).json({ error: "Only the client company can edit a project" }); return; }
    const project = await prisma.project.update({ where: { id }, data: req.body });
    res.json(project);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal error" }); }
});
