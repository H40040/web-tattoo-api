import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { resolveEffectivePermissions } from "../lib/permissions";

const prisma = new PrismaClient();

/**
 * Esperado:
 * - req.tenant = { id: string }
 * - req.studioRole = "OWNER" | "ADMIN" | "STAFF"
 */
export function requirePermission(permCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).tenant;
      const role = (req as any).studioRole;
      if (!tenant?.id) return res.status(401).json({ error: "Tenant não identificado" });
      if (!role) return res.status(403).json({ error: "Role do estúdio não identificado" });

      const perms = await resolveEffectivePermissions(prisma, tenant.id, role);
      if (!perms[permCode]) return res.status(403).json({ error: "Sem permissão", perm: permCode });

      (req as any).perms = perms;
      return next();
    } catch {
      return res.status(500).json({ error: "Falha ao validar permissão" });
    }
  };
}
