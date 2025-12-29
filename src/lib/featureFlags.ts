import { PrismaClient } from "@prisma/client";

export type EffectiveFlags = Record<string, boolean>;

const DEFAULT_FLAGS: Array<{ code: string; name: string; description?: string }> = [
  { code: "templates.premium", name: "Templates Premium", description: "Libera templates premium (upsell)." },
  { code: "domains.custom", name: "Domínio Personalizado", description: "Permite usar domínio próprio." },
  { code: "whatsapp.automation", name: "Automação WhatsApp", description: "Respostas rápidas e gatilhos." },
  { code: "marketplace.addons", name: "Marketplace de Add-ons", description: "Habilita add-ons internos." },
  { code: "seo.programmatic", name: "SEO Programático", description: "Páginas por cidade/estilo + sitemap." },
  { code: "studio.multiuser", name: "Multiusuário por estúdio", description: "Assentos e equipe." },
  { code: "analytics.cohorts", name: "Analytics por Coortes", description: "Relatórios de coorte 7/14/30." },
];

export async function ensureDefaultFlags(prisma: PrismaClient) {
  // idempotente
  for (const f of DEFAULT_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { code: f.code },
      update: { name: f.name, description: f.description ?? null },
      create: { code: f.code, name: f.name, description: f.description ?? null },
    });
  }
}

export async function resolveEffectiveFlags(prisma: PrismaClient, estudioId: string, planCode: string): Promise<EffectiveFlags> {
  await ensureDefaultFlags(prisma);

  const flags = await prisma.featureFlag.findMany({ select: { code: true } });
  const plan = await prisma.planFeatureFlag.findMany({
    where: { planCode },
    select: { flagCode: true, enabled: true },
  });
  const overrides = await prisma.tenantFeatureOverride.findMany({
    where: { estudioId },
    select: { flagCode: true, enabled: true },
  });

  const out: EffectiveFlags = {};
  for (const f of flags) out[f.code] = false;
  for (const pf of plan) out[pf.flagCode] = pf.enabled;
  for (const ov of overrides) out[ov.flagCode] = ov.enabled;

  return out;
}
