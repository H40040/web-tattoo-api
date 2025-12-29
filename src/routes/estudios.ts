import { assertEstudioForUsuario } from '../services/studioContext';
import express from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticateToken, requireRole } from '../middleware/auth';
import { requireStudioRole } from '../middleware/studioRole';
import { trackEvent } from '../services/audit';
import { Prisma } from '@prisma/client';
import { isPremiumTemplate } from '../services/templates';
import { getSubscriptionWithPlan } from '../services/entitlements';

const router: express.Router = express.Router();

// Validação com Zod
const estudioSchema = z.object({
  nome: z.string().min(2, 'Nome do estúdio deve ter pelo menos 2 caracteres'),
  descricao: z.string().optional(),
  telefone: z.string().min(10, 'Telefone inválido'),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  email: z.string().email('Email inválido'),
  endereco: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  website: z.string().optional(),
  horarioFuncionamento: z.string().optional(),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').optional(),
  dominio: z.string().optional(),
  template: z.enum(['MODERNO', 'CLASSICO', 'MINIMALISTA', 'ARTESANAL', 'URBANO']).optional(),
  cores: z.any().optional(),
});

// Listar todos os estúdios ativos (público)
router.get('/', async (req, res) => {
  try {
    const estudios = await prisma.estudio.findMany({
      // público só vê sites publicados
      where: { ativo: true, publicado: true },
      select: {
        id: true,
        nome: true,
        descricao: true,
        telefone: true,
        whatsapp: true,
        email: true,
        endereco: true,
        instagram: true,
        facebook: true,
        website: true,
        horarioFuncionamento: true,
        template: true,
        cores: true,
        publicado: true,
        slug: true,
        criadoEm: true,
      }
    });

    res.json({ estudios });
  } catch (error) {
    console.error('Erro ao buscar estúdios:', error);
    res.status(500).json({ error: 'Erro ao buscar estúdios' });
  }
});

// Obter estúdio por slug (público)
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const estudio = await prisma.estudio.findFirst({
      where: { slug, ativo: true, publicado: true },
      select: {
        id: true,
        nome: true,
        descricao: true,
        telefone: true,
        whatsapp: true,
        email: true,
        endereco: true,
        instagram: true,
        facebook: true,
        website: true,
        horarioFuncionamento: true,
        template: true,
        cores: true,
        publicado: true,
        slug: true,
        criadoEm: true,
        projetos: {
          where: { ativo: true },
          select: {
            id: true,
            titulo: true,
            descricao: true,
            imagens: true,
            categoria: true,
            tags: true,
            destaque: true,
            criadoEm: true,
          },
          orderBy: { criadoEm: 'desc' }
        },
        depoimentos: {
          where: { aprovado: true },
          select: {
            id: true,
            nome: true,
            texto: true,
            avaliacao: true,
            foto: true,
            criadoEm: true,
          },
          orderBy: { criadoEm: 'desc' }
        }
      }
    });
    if (!estudio) {
      return res.status(404).json({ error: 'Estúdio não encontrado' });
    }
    // @ts-ignore
    res.json({ estudio, studioRole: req.studio?.studioRole });
  } catch (error) {
    console.error('Erro ao buscar estúdio por slug:', error);
    res.status(500).json({ error: 'Erro ao buscar estúdio' });
  }
});

// Obter estúdio por domínio (público)
router.get('/dominio/:dominio', async (req, res) => {
  try {
    const { dominio } = req.params;
    const estudio = await prisma.estudio.findFirst({
      where: { dominio, ativo: true, publicado: true, dominioStatus: { in: ['ATIVO','VERIFICADO'] } },
      select: {
        id: true,
        nome: true,
        descricao: true,
        telefone: true,
        whatsapp: true,
        email: true,
        endereco: true,
        instagram: true,
        facebook: true,
        website: true,
        horarioFuncionamento: true,
        template: true,
        cores: true,
        publicado: true,
        slug: true,
        criadoEm: true,
        projetos: {
          where: { ativo: true },
          select: {
            id: true,
            titulo: true,
            descricao: true,
            imagens: true,
            categoria: true,
            tags: true,
            destaque: true,
            criadoEm: true,
          },
          orderBy: { criadoEm: 'desc' }
        },
        depoimentos: {
          where: { aprovado: true },
          select: {
            id: true,
            nome: true,
            texto: true,
            avaliacao: true,
            foto: true,
            criadoEm: true,
          },
          orderBy: { criadoEm: 'desc' }
        }
      }
    });
    if (!estudio) {
      return res.status(404).json({ error: 'Estúdio não encontrado' });
    }
    // @ts-ignore
    res.json({ estudio, studioRole: req.studio?.studioRole });
  } catch (error) {
    console.error('Erro ao buscar estúdio por domínio:', error);
    res.status(500).json({ error: 'Erro ao buscar estúdio' });
  }
});

// Obter estúdio por ID (público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const estudio = await prisma.estudio.findUnique({
      where: { id, ativo: true, publicado: true },
      select: {
        id: true,
        nome: true,
        descricao: true,
        telefone: true,
        whatsapp: true,
        email: true,
        endereco: true,
        instagram: true,
        facebook: true,
        website: true,
        horarioFuncionamento: true,
        template: true,
        cores: true,
        publicado: true,
        criadoEm: true,
        projetos: {
          where: { ativo: true },
          select: {
            id: true,
            titulo: true,
            descricao: true,
            imagens: true,
            categoria: true,
            tags: true,
            destaque: true,
            criadoEm: true,
          },
          orderBy: { criadoEm: 'desc' }
        },
        depoimentos: {
          where: { aprovado: true },
          select: {
            id: true,
            nome: true,
            texto: true,
            avaliacao: true,
            foto: true,
            criadoEm: true,
          },
          orderBy: { criadoEm: 'desc' }
        }
      }
    });

    if (!estudio) {
      return res.status(404).json({ error: 'Estúdio não encontrado' });
    }

    // @ts-ignore
    res.json({ estudio, studioRole: req.studio?.studioRole });
  } catch (error) {
    console.error('Erro ao buscar estúdio:', error);
    res.status(500).json({ error: 'Erro ao buscar estúdio' });
  }
});

// Atualizar estúdio (apenas tatuador dono)
router.put('/:id', authenticateToken, requireRole(['TATUADOR','CLIENTE']), requireStudioRole(['OWNER','ADMIN']), async (req: any, res) => {
  console.log('API: PUT /estudios/:id received', req.params.id, req.body);
  try {
    const { id } = req.params;
    const data = estudioSchema.partial().parse(req.body);

    // Validação: templates premium exigem plano com permissão
    if (data.template && isPremiumTemplate(data.template)) {
      // @ts-ignore
      const estudioId = req.studio?.estudioId as string;
      const sub = await getSubscriptionWithPlan(estudioId);
      const permite = !!(sub?.plano as any)?.permiteTemplatesPremium;
      if (!permite) {
        return res.status(402).json({
          error: 'Template premium disponível apenas no plano Pro/Studio. Faça upgrade para ativar.',
          code: 'PREMIUM_TEMPLATE_LOCKED',
        });
      }
    }

    // Validação: domínio próprio exige plano Pro/Studio
    if (data.dominio) {
      // @ts-ignore
      const estudioId = req.studio?.estudioId as string;
      const sub = await getSubscriptionWithPlan(estudioId);
      const planCode = (sub?.plano as any)?.codigo || (sub?.plano as any)?.nome?.toLowerCase?.();
      const allowed = planCode && !String(planCode).includes('starter') && !String(planCode).includes('basic');
      if (!allowed) {
        return res.status(402).json({
          error: 'Domínio personalizado disponível apenas no plano Pro/Studio. Faça upgrade para ativar.',
          code: 'CUSTOM_DOMAIN_LOCKED',
        });
      }
    }

    // Verificar se o estúdio corresponde ao contexto do usuário (owner/admin)
    const estudio = await prisma.estudio.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!estudio) {
      return res.status(404).json({ error: 'Estúdio não encontrado' });
    }

    // @ts-ignore - injetado por requireStudioRole
    if (req.studio?.estudioId !== id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Atualizar estúdio
    const updatedEstudio = await prisma.estudio.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        descricao: true,
        telefone: true,
        whatsapp: true,
        email: true,
        endereco: true,
        instagram: true,
        facebook: true,
        website: true,
        horarioFuncionamento: true,
        template: true,
        cores: true,
        atualizadoEm: true,
      }
    });

    res.json({ 
      message: 'Estúdio atualizado com sucesso',
      estudio: updatedEstudio 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined)?.[0] || 'campo';
      const fieldLabel = target === 'slug' ? 'slug' : target === 'dominio' ? 'domínio' : target;
      return res.status(409).json({ error: `O ${fieldLabel} já está em uso` });
    }
    console.error('Erro ao atualizar estúdio:', error);
    res.status(500).json({ error: 'Erro ao atualizar estúdio' });
  }
});

// Obter meu estúdio (tatuador autenticado)
router.get('/meu/estudio', authenticateToken, requireRole(['TATUADOR','CLIENTE']), requireStudioRole(['OWNER','ADMIN','STAFF']), async (req: any, res) => {
  try {
    const ctx = await assertEstudioForUsuario(req.user.id);
      if ('error' in ctx) return res.status(404).json({ error: ctx.error });
      const { estudioId } = ctx;
      const estudio = await prisma.estudio.findUnique({
      where: { id: estudioId },
      select: {
        id: true,
        nome: true,
        descricao: true,
        telefone: true,
        whatsapp: true,
        email: true,
        endereco: true,
        instagram: true,
        facebook: true,
        website: true,
        horarioFuncionamento: true,
        template: true,
        cores: true,
        publicado: true,
        onboardingStep: true,
        onboardingConcluido: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        _count: {
          select: {
            projetos: true,
            depoimentos: true,
            orcamentos: true,
          }
        }
      }
    });

    if (!estudio) {
      return res.status(404).json({ error: 'Estúdio não encontrado' });
    }

    // @ts-ignore
    res.json({ estudio, studioRole: req.studio?.studioRole });
  } catch (error) {
    console.error('Erro ao buscar meu estúdio:', error);
    res.status(500).json({ error: 'Erro ao buscar estúdio' });
  }
});

// Atualizar progresso do onboarding (tatuador)
router.patch('/meu/onboarding', authenticateToken, requireRole(['TATUADOR','CLIENTE']), requireStudioRole(['OWNER','ADMIN']), async (req: any, res) => {
  try {
    const body = z.object({ step: z.number().int().min(0).max(10) }).parse(req.body);

    // @ts-ignore
    const estudioId = req.studio?.estudioId as string;

    const updated = await prisma.estudio.update({
      where: { id: estudioId },
      data: {
        onboardingStep: body.step,
        onboardingConcluido: body.step >= 5,
      },
      select: { id: true, onboardingStep: true, onboardingConcluido: true }
    });

    await trackEvent({ estudioId, tipo: 'ONBOARDING_STEP', metadata: { step: body.step } });

    res.json({ message: 'Onboarding atualizado', estudio: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Erro ao atualizar onboarding:', error);
    res.status(500).json({ error: 'Erro ao atualizar onboarding' });
  }
});

// Publicar site (tatuador) — marca como publicado e conclui onboarding
router.post('/meu/publicar', authenticateToken, requireRole(['TATUADOR','CLIENTE']), requireStudioRole(['OWNER','ADMIN']), async (req: any, res) => {
  try {
    // @ts-ignore
    const estudioId = req.studio?.estudioId as string;

    const updated = await prisma.estudio.update({
      where: { id: estudioId },
      data: {
        publicado: true,
        onboardingConcluido: true,
        onboardingStep: 5,
      },
      select: { id: true, slug: true, dominio: true, publicado: true }
    });

    await trackEvent({ estudioId, tipo: 'PUBLISH_SITE' });
    await trackEvent({ estudioId: updated.id, tipo: 'STUDIO_PUBLISHED', metadata: { slug: updated.slug } });
    res.json({ message: 'Site publicado com sucesso', estudio: updated });
  } catch (error) {
    console.error('Erro ao publicar site:', error);
    res.status(500).json({ error: 'Erro ao publicar site' });
  }
});

export default router;
