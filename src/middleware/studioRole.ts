import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest } from './auth';

export type StudioRole = 'OWNER' | 'ADMIN' | 'STAFF';

/**
 * Resolve estúdio ativo + papel do usuário.
 * - Se o usuário é owner (estudio.usuarioId), role=OWNER
 * - Senão, pega o primeiro vínculo em EstudioUsuario (role conforme tabela)
 */
export async function resolveStudioContextByUser(
  usuarioId: string
): Promise<{ estudioId: string; studioRole: StudioRole } | { error: string }> {
  const owner = await prisma.estudio.findUnique({
    where: { usuarioId },
    select: { id: true, ativo: true },
  });
  if (owner?.ativo) return { estudioId: owner.id, studioRole: 'OWNER' };

  const membro = await prisma.estudioUsuario.findFirst({
    where: { usuarioId },
    select: { estudioId: true, role: true, estudio: { select: { ativo: true } } },
    orderBy: { criadoEm: 'asc' },
  });

  if (membro?.estudio?.ativo) {
    return { estudioId: membro.estudioId, studioRole: (membro.role as StudioRole) };
  }

  return { error: 'Estúdio não encontrado para este usuário.' };
}

/**
 * Middleware que injeta ctx do estúdio no request e valida papel.
 * Anexa em req: req.studio = { estudioId, studioRole }
 */
export function requireStudioRole(roles: StudioRole[]) {
  return async (req: AuthenticatedRequest & { studio?: any }, res: Response, next: NextFunction) => {
    console.log('Middleware: requireStudioRole check', req.user?.id);
    if (!req.user) return res.status(401).json({ error: 'Usuário não autenticado' });

    const ctx = await resolveStudioContextByUser(req.user.id);
    console.log('Middleware: resolved ctx', ctx);
    if ('error' in ctx) return res.status(404).json({ error: ctx.error });

    req.studio = ctx;

    if (!roles.includes(ctx.studioRole)) {
      return res.status(403).json({ error: 'Acesso negado (papel insuficiente no estúdio)' });
    }

    return next();
  };
}
