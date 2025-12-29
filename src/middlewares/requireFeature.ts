import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { resolveEffectiveFlags } from "../lib/featureFlags";

const prisma = new PrismaClient();

/**
 * Depende de você já preencher `req.user` e `req.tenant` no auth middleware.
 * Esperado:
 * - req.tenant = { id: string, planCode: string }
 */
export function requireFeature(flagCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).tenant;
      if (!tenant?.id) return res.status(401).json({ error: "Tenant não identificado" });

      const flags = await resolveEffectiveFlags(prisma, tenant.id, tenant.planCode);
      if (!flags[flagCode]) {
        return res.status(403).json({ error: "Feature bloqueada pelo plano", flag: flagCode });
      }
      (req as any).flags = flags;
      return next();
    } catch (e) {
      return res.status(500).json({ error: "Falha ao validar feature" });
    }
  };
}
