import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { getAccessScope } from "../access";

export const contractorsRouter = Router();

interface ContractorNode {
  id: string;
  name: string;
  type: string;
  parentCompanyId: string | null;
  children: ContractorNode[];
}

/**
 * GET /contractors/tree
 * Returns the contractor hierarchy visible to the caller.
 *
 * Visibility:
 *   - The user's own companies
 *   - Any company that owns a package the user can access
 *   - All ancestors (so the chain is coherent up to a root)
 *
 * Response: nested ContractorNode[]; any visible company whose parent is
 * outside the visible set is returned as a root.
 */
contractorsRouter.get("/tree", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const scope = await getAccessScope(req.userId!);

    const accessiblePkgs = scope.packageIds.size
      ? await prisma.workPackage.findMany({
          where: { id: { in: [...scope.packageIds] } },
          select: { ownerCompanyId: true },
        })
      : [];

    const visible = new Set<string>(scope.companyIds);
    for (const p of accessiblePkgs) {
      if (p.ownerCompanyId) visible.add(p.ownerCompanyId);
    }

    const all = await prisma.company.findMany({
      select: { id: true, name: true, type: true, parentCompanyId: true },
    });
    const byId = new Map(all.map((c) => [c.id, c]));

    // Add ancestors of every visible company.
    for (const id of [...visible]) {
      let cur = byId.get(id);
      while (cur?.parentCompanyId) {
        if (visible.has(cur.parentCompanyId)) break;
        visible.add(cur.parentCompanyId);
        cur = byId.get(cur.parentCompanyId);
      }
    }

    const nodes = new Map<string, ContractorNode>();
    for (const id of visible) {
      const c = byId.get(id);
      if (!c) continue;
      nodes.set(id, { id: c.id, name: c.name, type: c.type, parentCompanyId: c.parentCompanyId, children: [] });
    }

    const roots: ContractorNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentCompanyId && nodes.has(node.parentCompanyId)) {
        nodes.get(node.parentCompanyId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json(roots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

/**
 * POST /contractors/link  { childId, parentId }
 * Sets parentId as the parent company of childId.
 *
 * Authorization: caller must be a member of the parent company — you can only
 * add sub-contractors under a company you belong to.
 */
contractorsRouter.post("/link", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { childId, parentId } = req.body ?? {};
    if (!childId || !parentId) { res.status(400).json({ error: "childId and parentId required" }); return; }
    if (childId === parentId) { res.status(400).json({ error: "A company cannot be its own parent" }); return; }

    const scope = await getAccessScope(req.userId!);
    if (!scope.companyIds.includes(parentId)) {
      res.status(403).json({ error: "You must be a member of the parent company" });
      return;
    }

    // Cycle check: walk up from parentId; if we reach childId, linking would create a loop.
    const all = await prisma.company.findMany({ select: { id: true, parentCompanyId: true } });
    const parentOf = new Map(all.map((c) => [c.id, c.parentCompanyId]));
    let cur: string | null | undefined = parentId;
    const seen = new Set<string>();
    while (cur) {
      if (cur === childId) { res.status(400).json({ error: "Link would create a cycle" }); return; }
      if (seen.has(cur)) break;
      seen.add(cur);
      cur = parentOf.get(cur) ?? null;
    }

    const updated = await prisma.company.update({
      where: { id: childId },
      data: { parentCompanyId: parentId },
      select: { id: true, name: true, type: true, parentCompanyId: true },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
