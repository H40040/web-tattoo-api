import { prisma } from '../server';
import { resolveEstudioIdByUsuario } from './studioContext';

export type EntitlementCheck =
  | { ok: true }
  | { ok: false; code: 'NO_STUDIO' | 'NO_SUBSCRIPTION' | 'INACTIVE_SUBSCRIPTION' | 'LIMIT_REACHED'; message: string };

export async function getEstudioByUsuarioId(usuarioId: string) {
  const estudioId = await resolveEstudioIdByUsuario(usuarioId);
  if (!estudioId) return null;
  return prisma.estudio.findUnique({
    where: { id: estudioId },
    select: { id: true, ativo: true }
  });
}

export async function getSubscriptionWithPlan(estudioId: string) {
  return prisma.planoAssinatura.findUnique({
    where: { estudioId },
    select: {
      id: true,
      ativo: true,
      status: true,
      currentPeriodEnd: true,
      plano: {
        select: {
          id: true,
          nome: true,
          preco: true,
          limiteProjetos: true,
          limiteDepoimentos: true,
          limiteOrcamentosMensal: true,
          limiteUsuarios: true,
          ativo: true,
        }
      }
    }
  });
}

const GRACE_PERIOD_DAYS = Number(process.env.GRACE_PERIOD_DAYS || 7);

export function isSubscriptionActive(status: string, ativo: boolean, currentPeriodEnd?: Date | null) {
  if (!ativo) return false;
  if (status === 'ACTIVE' || status === 'TRIALING') return true;
  if (status === 'PAST_DUE' && currentPeriodEnd) {
    const graceMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    return (Date.now() - currentPeriodEnd.getTime()) <= graceMs;
  }
  return false;
}

export async function assertCanCreateProjeto(estudioId: string): Promise<EntitlementCheck> {
  const sub = await getSubscriptionWithPlan(estudioId);
  if (!sub) return { ok: false, code: 'NO_SUBSCRIPTION', message: 'Nenhuma assinatura encontrada para este estúdio.' };
  if (!sub.plano.ativo) return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'O plano associado está inativo.' };
  if (!isSubscriptionActive(sub.status, sub.ativo, sub.currentPeriodEnd)) {
    return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'Assinatura inativa. Regularize o pagamento para continuar.' };
  }

  if (sub.plano.limiteProjetos != null) {
    const count = await prisma.projeto.count({ where: { estudioId, ativo: true } });
    if (count >= sub.plano.limiteProjetos) {
      return { ok: false, code: 'LIMIT_REACHED', message: `Limite de projetos do plano atingido (${sub.plano.limiteProjetos}).` };
    }
  }

  return { ok: true };
}

export async function assertCanCreateDepoimento(estudioId: string): Promise<EntitlementCheck> {
  const sub = await getSubscriptionWithPlan(estudioId);
  if (!sub) return { ok: false, code: 'NO_SUBSCRIPTION', message: 'Nenhuma assinatura encontrada para este estúdio.' };
  if (!sub.plano.ativo) return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'O plano associado está inativo.' };
  if (!isSubscriptionActive(sub.status, sub.ativo, sub.currentPeriodEnd)) {
    return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'Assinatura inativa. Regularize o pagamento para continuar.' };
  }

  if (sub.plano.limiteDepoimentos != null) {
    const count = await prisma.depoimento.count({ where: { estudioId } });
    if (count >= sub.plano.limiteDepoimentos) {
      return { ok: false, code: 'LIMIT_REACHED', message: `Limite de depoimentos do plano atingido (${sub.plano.limiteDepoimentos}).` };
    }
  }

  return { ok: true };
}

export async function assertCanReceiveOrcamento(estudioId: string): Promise<EntitlementCheck> {
  const sub = await getSubscriptionWithPlan(estudioId);
  if (!sub) return { ok: false, code: 'NO_SUBSCRIPTION', message: 'Nenhuma assinatura encontrada para este estúdio.' };
  if (!sub.plano.ativo) return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'O plano associado está inativo.' };
  if (!isSubscriptionActive(sub.status, sub.ativo, sub.currentPeriodEnd)) {
    return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'Assinatura inativa. Regularize o pagamento para continuar.' };
  }

  const limit = (sub.plano as any).limiteOrcamentosMensal as number | null | undefined;
  if (limit != null) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const count = await prisma.orcamento.count({ where: { estudioId, criadoEm: { gte: start, lt: end } } });
    if (count >= limit) {
      return { ok: false, code: 'LIMIT_REACHED', message: `Limite mensal de solicitações de orçamento atingido (${limit}).` };
    }
  }

  return { ok: true };
}

export async function assertCanAddMembro(estudioId: string): Promise<EntitlementCheck> {
  const sub = await getSubscriptionWithPlan(estudioId);
  if (!sub) return { ok: false, code: 'NO_SUBSCRIPTION', message: 'Nenhuma assinatura encontrada para este estúdio.' };
  if (!sub.plano.ativo) return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'O plano associado está inativo.' };
  if (!isSubscriptionActive(sub.status, sub.ativo, sub.currentPeriodEnd)) {
    return { ok: false, code: 'INACTIVE_SUBSCRIPTION', message: 'Assinatura inativa. Regularize o pagamento para continuar.' };
  }

  const limit = sub.plano.limiteUsuarios;
  if (!limit) return { ok: true };

  const membros = await prisma.estudioUsuario.count({ where: { estudioId } });
  const total = 1 + membros; // owner + membros
  if (total >= limit) {
    return { ok: false, code: 'LIMIT_REACHED', message: 'Limite de usuários do plano atingido. Faça upgrade para adicionar equipe.' };
  }
  return { ok: true };
}
