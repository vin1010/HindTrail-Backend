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
  packageIds: Set<string>;
  projectIds: Set<string>;
  companyIds: string[];
  isClientOfProject: (projectId: string) => boolean;
}

/**
 * Computes the set of package and project IDs a user is permitted to see.
 *
 * Access rules (matches the HindTrail tree-visibility spec):
 *   1. Client company of a project: full access to every package in that project.
 *   2. Owner company of a package: access to that package + all descendants.
 *   3. Invited PackageMember (by email): access to that specific package only.
 *
 * Note: at MVP scale (hundreds of packages) we scan all packages once per
 * request to walk the tree. Revisit if this becomes hot.
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

  const childrenMap = new Map<string, string[]>();
  for (const pkg of allPackages) {
    if (!pkg.parentId) continue;
    const arr = childrenMap.get(pkg.parentId);
    if (arr) arr.push(pkg.id);
    else childrenMap.set(pkg.parentId, [pkg.id]);
  }

  const packageIds = new Set<string>();
  const projectIds = new Set<string>(clientProjectIds);

  for (const pkg of allPackages) {
    if (clientProjectIds.has(pkg.projectId)) packageIds.add(pkg.id);
  }

  const queue: string[] = [];
  for (const pkg of allPackages) {
    if (pkg.ownerCompanyId && companyIds.includes(pkg.ownerCompanyId)) {
      queue.push(pkg.id);
    }
  }
  while (queue.length) {
    const id = queue.shift()!;
    if (packageIds.has(id)) continue;
    packageIds.add(id);
    const children = childrenMap.get(id);
    if (children) queue.push(...children);
  }

  for (const grant of memberGrants) packageIds.add(grant.packageId);

  const pkgProjectMap = new Map(allPackages.map((p) => [p.id, p.projectId]));
  for (const id of packageIds) {
    const projectId = pkgProjectMap.get(id);
    if (projectId) projectIds.add(projectId);
  }

  return {
    packageIds,
    projectIds,
    companyIds,
    isClientOfProject: (projectId: string) => clientProjectIds.has(projectId),
  };
}

export async function canAccessPackage(userId: string, packageId: string): Promise<boolean> {
  const scope = await getAccessScope(userId);
  return scope.packageIds.has(packageId);
}
