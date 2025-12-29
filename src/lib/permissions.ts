import { PrismaClient } from "@prisma/client";

export type EffectivePermissions = Record<string, boolean>;

const DEFAULT_PERMS: Array<{ code: string; name: string; description?: string }> = [
  { code: "billing.manage", name: "Gerenciar cobrança", description: "Checkout, portal e cancelamento." },
  { code: "domain.manage", name: "Gerenciar domínio", description: "Solicitar e verificar domínio." },
  { code: "team.manage", name: "Gerenciar equipe", description: "Convites, remoção e roles." },
  { code: "content.write", name: "Editar conteúdo", description: "Projetos, depoimentos, dados do estúdio." },
  { code: "leads.write", name: "Gerenciar leads", description: "Orçamentos e kanban." },
  { code: "analytics.view", name: "Ver relatórios", description: "Métricas e dashboards." },
];

export async function ensureDefaultPermissions(prisma: PrismaClient) {
  for (const p of DEFAULT_PERMS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description ?? null },
      create: { code: p.code, name: p.name, description: p.description ?? null },
    });
  }

  // Padrão por role (idempotente)
  const roleMatrix: Record<string, string[]> = {
    OWNER: ["billing.manage", "domain.manage", "team.manage", "content.write", "leads.write", "analytics.view"],
    ADMIN: ["billing.manage", "domain.manage", "team.manage", "content.write", "leads.write", "analytics.view"],
    STAFF: ["content.write", "leads.write", "analytics.view"], // sem billing/domain/team
  };

  for (const role of Object.keys(roleMatrix)) {
    for (const perm of DEFAULT_PERMS) {
      const allowed = roleMatrix[role].includes(perm.code);
      await prisma.rolePermission.upsert({
        where: { studioRole_permCode: { studioRole: role, permCode: perm.code } },
        update: { allowed },
        create: { studioRole: role, permCode: perm.code, allowed },
      });
    }
  }
}

export async function resolveEffectivePermissions(prisma: PrismaClient, estudioId: string, studioRole: string): Promise<EffectivePermissions> {
  await ensureDefaultPermissions(prisma);

  const base = await prisma.rolePermission.findMany({
    where: { studioRole },
    select: { permCode: true, allowed: true },
  });
  const overrides = await prisma.tenantPermissionOverride.findMany({
    where: { estudioId },
    select: { permCode: true, allowed: true },
  });

  const out: EffectivePermissions = {};
  for (const b of base) out[b.permCode] = b.allowed;
  for (const o of overrides) out[o.permCode] = o.allowed;
  return out;
}
