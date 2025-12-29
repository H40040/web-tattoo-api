import { prisma } from '../server';

/**
 * Resolve o estúdio "ativo" do usuário (owner ou membro).
 * Regra:
 * 1) Se o usuário é owner (estudio.usuarioId), retorna esse.
 * 2) Senão, retorna o primeiro vínculo em EstudioUsuario.
 */
export async function resolveEstudioIdByUsuario(usuarioId: string): Promise<string | null> {
  const owner = await prisma.estudio.findUnique({
    where: { usuarioId },
    select: { id: true, ativo: true },
  });
  if (owner?.ativo) return owner.id;

  const membro = await prisma.estudioUsuario.findFirst({
    where: { usuarioId },
    select: { estudioId: true, estudio: { select: { ativo: true } } },
    orderBy: { criadoEm: 'asc' },
  });
  if (membro?.estudio?.ativo) return membro.estudioId;

  return null;
}

export async function assertEstudioForUsuario(usuarioId: string): Promise<{ estudioId: string } | { error: string }> {
  const estudioId = await resolveEstudioIdByUsuario(usuarioId);
  if (!estudioId) return { error: 'Estúdio não encontrado para este usuário.' };
  return { estudioId };
}
