import { prisma } from '../server';

export async function auditLog(params: {
  acao: any;
  actorUsuarioId?: string | null;
  estudioId?: string | null;
  entidade?: string | null;
  entidadeId?: string | null;
  metadata?: any;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        acao: params.acao,
        actorUsuarioId: params.actorUsuarioId ?? null,
        estudioId: params.estudioId ?? null,
        entidade: params.entidade ?? null,
        entidadeId: params.entidadeId ?? null,
        metadata: params.metadata ?? null,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      } as any,
    });
  } catch (e) {
    // Auditoria nunca deve quebrar o fluxo
    console.warn('[audit] falha ao registrar auditLog:', e);
  }
}

export async function trackEvent(params: {
  estudioId: string;
  tipo: any;
  quantidade?: number;
  metadata?: any;
}) {
  try {
    await prisma.eventoUso.create({
      data: {
        estudioId: params.estudioId,
        tipo: params.tipo,
        quantidade: params.quantidade ?? 1,
        metadata: params.metadata ?? null,
      } as any,
    });
  } catch (e) {
    console.warn('[audit] falha ao registrar eventoUso:', e);
  }
}
