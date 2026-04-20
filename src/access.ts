import { prisma } from "./db";

async function getUserCompanyIds(userId: string): Promise<string[]> {
  const memberships = await prisma.companyUser.findMany({
    where: { userId, status: "active" },
    select: { companyId: true },
  });
  return memberships.map((m) => m.companyId);
}

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ?? null;
}

export interface AccessScope {
  /** Packages the caller may read directly (entities, members, documents). */
  packageIds: Set<string>;
  /** Packages that may be counted in aggregate rollups (packageIds + descendants). */
  rollupPackageIds: Set<string>;
  projectIds: Set<string>;
  companyIds: string[];
  isClientOfProject: (projectId: string) => boolean;
}

/**
 * Tree visibility: each tier sees only its own packages and its direct subs'.
 *
 *   client company        → root packages of their projects
 *   owner of a package    → that package
 *   owner of a parent     → that parent's direct children (their invited subs)
 *   PackageMember grant   → that specific package only
 *
 * Sub-sub and deeper tiers are NOT readable. However `rollupPackageIds`
 * includes every descendant of a readable package so aggregate counts
 * (open-issue count, completion %, etc.) can still bubble up without
 * leaking who did the work.
 */
export async function getAccessScope(userId: string): Promise<AccessScope> {
  const [companyIds, email] = await Promise.all([
    getUserCompanyIds(userId),
    getUserEmail(userId),
  ]);

  const [allPackages, clientProjects, memberGrants] = await Promise.all([
    prisma.workPackage.findMany({
      select: { id: true, parentId: true, projectId: true, ownerCompanyId: true },
    }),
    companyIds.length
      ? prisma.project.findMany({
          where: { clientCompanyId: { in: companyIds } },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
    email
      ? prisma.packageMember.findMany({
          where: { email },
          select: { packageId: true },
        })
      : Promise.resolve([] as { packageId: string }[]),
  ]);

  const clientProjectIds = new Set(clientProjects.map((p) => p.id));
  const companyIdSet = new Set(companyIds);
  const pkgById = new Map(allPackages.map((p) => [p.id, p]));

  const childrenMap = new Map<string, string[]>();
  for (const pkg of allPackages) {
    if (!pkg.parentId) continue;
    const arr = childrenMap.get(pkg.parentId);
    if (arr) arr.push(pkg.id);
    else childrenMap.set(pkg.parentId, [pkg.id]);
  }

  const packageIds = new Set<string>();

  for (const pkg of allPackages) {
    // Rule 1: own it
    if (pkg.ownerCompanyId && companyIdSet.has(pkg.ownerCompanyId)) {
      packageIds.add(pkg.id);
      continue;
    }
    // Rule 2: parent owned by us (one-level descent — our direct subs)
    if (pkg.parentId) {
      const parent = pkgById.get(pkg.parentId);
      if (parent?.ownerCompanyId && companyIdSet.has(parent.ownerCompanyId)) {
        packageIds.add(pkg.id);
        continue;
      }
    }
    // Rule 3: root package of a project we are the client of
    if (!pkg.parentId && clientProjectIds.has(pkg.projectId)) {
      packageIds.add(pkg.id);
    }
  }

  // Rule 4: explicit PackageMember invites by email (no descent)
  for (const grant of memberGrants) packageIds.add(grant.packageId);

  // Rollup set: every readable package + all descendants (privacy-safe
  // because we only expose counts downstream, never entity contents).
  const rollupPackageIds = new Set(packageIds);
  const queue = [...packageIds];
  while (queue.length) {
    const id = queue.shift()!;
    const children = childrenMap.get(id);
    if (!children) continue;
    for (const cid of children) {
      if (!rollupPackageIds.has(cid)) {
        rollupPackageIds.add(cid);
        queue.push(cid);
      }
    }
  }

  const projectIds = new Set<string>(clientProjectIds);
  for (const id of packageIds) {
    const pkg = pkgById.get(id);
    if (pkg) projectIds.add(pkg.projectId);
  }

  return {
    packageIds,
    rollupPackageIds,
    projectIds,
    companyIds,
    isClientOfProject: (projectId: string) => clientProjectIds.has(projectId),
  };
}

export async function canAccessPackage(userId: string, packageId: string): Promise<boolean> {
  const scope = await getAccessScope(userId);
  return scope.packageIds.has(packageId);
}

export interface PackageRollup {
  descendantCount: number;
  openIssues: number;
  pendingApprovals: number;
  documentsCount: number;
  inspectionsCount: number;
  completionPct: number;
}

/**
 * For each of the given root package IDs, compute aggregate counters
 * across its full subtree (root + descendants). Intended to surface
 * "what's happening below me" to tiers that can't read the entities
 * directly. Safe to expose counts upward — never exposes record contents.
 */
export async function computePackageRollups(rootIds: string[]): Promise<Map<string, PackageRollup>> {
  if (rootIds.length === 0) return new Map();

  const allPackages = await prisma.workPackage.findMany({
    select: { id: true, parentId: true, status: true },
  });
  const childrenMap = new Map<string, string[]>();
  for (const pkg of allPackages) {
    if (!pkg.parentId) continue;
    const arr = childrenMap.get(pkg.parentId);
    if (arr) arr.push(pkg.id);
    else childrenMap.set(pkg.parentId, [pkg.id]);
  }
  const statusById = new Map(allPackages.map((p) => [p.id, p.status]));

  const subtreeByRoot = new Map<string, string[]>();
  const unionIds = new Set<string>();
  for (const root of rootIds) {
    const collected: string[] = [root];
    const stack = [root];
    while (stack.length) {
      const id = stack.pop()!;
      const kids = childrenMap.get(id);
      if (!kids) continue;
      for (const k of kids) { collected.push(k); stack.push(k); }
    }
    subtreeByRoot.set(root, collected);
    for (const id of collected) unionIds.add(id);
  }

  const unionArr = [...unionIds];
  const [issueRows, approvalRows, docRows, inspectionRows] = await Promise.all([
    prisma.issue.groupBy({
      by: ["packageId"],
      where: { packageId: { in: unionArr }, NOT: { status: "Closed" } },
      _count: { id: true },
    }),
    prisma.approval.groupBy({
      by: ["packageId"],
      where: { packageId: { in: unionArr }, decision: "Pending" },
      _count: { id: true },
    }),
    prisma.document.groupBy({
      by: ["packageId"],
      where: { packageId: { in: unionArr } },
      _count: { id: true },
    }),
    prisma.inspection.groupBy({
      by: ["packageId"],
      where: { packageId: { in: unionArr } },
      _count: { id: true },
    }),
  ]);

  const issueMap = new Map(issueRows.map((r) => [r.packageId, r._count.id]));
  const approvalMap = new Map(approvalRows.map((r) => [r.packageId, r._count.id]));
  const docMap = new Map(docRows.map((r) => [r.packageId, r._count.id]));
  const inspMap = new Map(inspectionRows.map((r) => [r.packageId, r._count.id]));

  const DONE_STATUSES = new Set(["Closed", "Ready for Handover"]);

  const result = new Map<string, PackageRollup>();
  for (const [root, subtree] of subtreeByRoot) {
    let openIssues = 0;
    let pendingApprovals = 0;
    let documentsCount = 0;
    let inspectionsCount = 0;
    let done = 0;
    for (const id of subtree) {
      openIssues += issueMap.get(id) ?? 0;
      pendingApprovals += approvalMap.get(id) ?? 0;
      documentsCount += docMap.get(id) ?? 0;
      inspectionsCount += inspMap.get(id) ?? 0;
      if (DONE_STATUSES.has(statusById.get(id) ?? "")) done += 1;
    }
    const total = subtree.length;
    result.set(root, {
      descendantCount: total - 1,
      openIssues,
      pendingApprovals,
      documentsCount,
      inspectionsCount,
      completionPct: total === 0 ? 0 : Math.round((done / total) * 100),
    });
  }
  return result;
}
