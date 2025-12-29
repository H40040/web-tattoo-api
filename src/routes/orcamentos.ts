import { assertEstudioForUsuario } from '../services/studioContext';
import express from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { assertCanReceiveOrcamento } from '../services/entitlements';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: express.Router = express.Router();

// Validação com Zod
const orcamentoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  tamanho: z.enum(['PEQUENO', 'MEDIO', 'GRANDE', 'EXTRA_GRANDE']).optional(),
  cor: z.boolean().optional(),
  parteCorpo: z.array(z.string()).optional(),
  referencias: z.array(z.string()).optional(),
});

const orcamentoUpdateSchema = z.object({
  orcamento: z.number().positive('Orçamento deve ser positivo').optional(),
  status: z.enum(['PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'CONCLUIDO']).optional(),
});

// Criar orçamento (público)
router.post('/', async (req, res) => {
  try {
    const data = orcamentoSchema.parse(req.body);
    const { estudioId } = req.query;

    if (!estudioId) {
      return res.status(400).json({ error: 'ID do estúdio é obrigatório' });
    }

    // Verificar se o estúdio existe e está ativo
    const estudio = await prisma.estudio.findUnique({
      where: { id: estudioId as string, ativo: true },
      select: { 
        id: true,
        nome: true,
        whatsapp: true,
        email: true 
      }
    });

    if (!estudio) {
      return res.status(404).json({ error: 'Estúdio não encontrado' });
    }

    // Criar orçamento
    const orcamento = await prisma.orcamento.create({
      data: {
        ...data,
        estudioId: estudioId as string,
        status: 'PENDENTE',
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        descricao: true,
        tamanho: true,
        cor: true,
        parteCorpo: true,
        referencias: true,
        status: true,
        criadoEm: true,
      }
    });

    res.status(201).json({ 
      message: 'Orçamento enviado com sucesso',
      orcamento 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
});

// Listar orçamentos do meu estúdio (tatuador autenticado)
router.get('/meus/orcamentos', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
  try {
    const ctx = await assertEstudioForUsuario(req.user.id);
      if ('error' in ctx) return res.status(404).json({ error: ctx.error });
      const estudio = await prisma.estudio.findUnique({
      where: { id: ctx.estudioId },
      select: { id: true }
    });

    if (!estudio) {
      return res.status(404).json({ error: 'Estúdio não encontrado' });
    }

    const { status } = req.query;
    const where: any = { estudioId: estudio.id };

    if (status) {
      where.status = status;
    }

    const orcamentos = await prisma.orcamento.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        descricao: true,
        tamanho: true,
        cor: true,
        parteCorpo: true,
        referencias: true,
        orcamento: true,
        status: true,
        criadoEm: true,
        atualizadoEm: true,
      },
      orderBy: { criadoEm: 'desc' }
    });

    res.json({ orcamentos });
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
});

// Listar orçamentos (ADMIN - todos os estúdios, com filtros)
router.get('/admin/orcamentos', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const { status, estudioId, limit } = req.query as { status?: string; estudioId?: string; limit?: string };
    const where: any = {};
    if (estudioId) {
      where.estudioId = estudioId;
    }
    if (status) {
      where.status = status;
    }
    const take = Math.min(parseInt(limit || '50', 10), 100);
    const orcamentos = await prisma.orcamento.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        descricao: true,
        tamanho: true,
        cor: true,
        parteCorpo: true,
        referencias: true,
        orcamento: true,
        status: true,
        criadoEm: true,
        atualizadoEm: true,
        estudio: {
          select: { id: true, nome: true }
        }
      },
      orderBy: { criadoEm: 'desc' },
      take
    });
    res.json({ orcamentos });
  } catch (error) {
    console.error('Erro ao buscar orçamentos (admin):', error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
});

// Obter orçamento específico (tatuador dono)
router.get('/:id', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
  try {
    const { id } = req.params;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      select: { 
        estudio: {
          select: { usuarioId: true }
        }
      }
    });

    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    if (orcamento.estudio.usuarioId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const fullOrcamento = await prisma.orcamento.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        descricao: true,
        tamanho: true,
        cor: true,
        parteCorpo: true,
        referencias: true,
        orcamento: true,
        status: true,
        criadoEm: true,
        atualizadoEm: true,
        estudio: {
          select: {
            id: true,
            nome: true,
          }
        }
      }
    });

    res.json({ orcamento: fullOrcamento });
  } catch (error) {
    console.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamento' });
  }
});

// Obter orçamento específico (ADMIN - leitura)
router.get('/admin/:id', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const { id } = req.params;
    const fullOrcamento = await prisma.orcamento.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        descricao: true,
        tamanho: true,
        cor: true,
        parteCorpo: true,
        referencias: true,
        orcamento: true,
        status: true,
        criadoEm: true,
        atualizadoEm: true,
        estudio: {
          select: {
            id: true,
            nome: true,
          }
        }
      }
    });
    if (!fullOrcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
    res.json({ orcamento: fullOrcamento });
  } catch (error) {
    console.error('Erro ao buscar orçamento (admin):', error);
    res.status(500).json({ error: 'Erro ao buscar orçamento' });
  }
});

// Atualizar orçamento (tatuador dono)
router.put('/:id', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
  try {
    const { id } = req.params;
    const data = orcamentoUpdateSchema.parse(req.body);

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      select: { 
        estudio: {
          select: { usuarioId: true }
        }
      }
    });

    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    if (orcamento.estudio.usuarioId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updatedOrcamento = await prisma.orcamento.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        descricao: true,
        tamanho: true,
        cor: true,
        parteCorpo: true,
        referencias: true,
        orcamento: true,
        status: true,
        atualizadoEm: true,
      }
    });

    res.json({ 
      message: 'Orçamento atualizado com sucesso',
      orcamento: updatedOrcamento 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Erro ao atualizar orçamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar orçamento' });
  }
});

// Deletar orçamento (tatuador dono)
router.delete('/:id', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
  try {
    const { id } = req.params;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      select: { 
        estudio: {
          select: { usuarioId: true }
        }
      }
    });

    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    if (orcamento.estudio.usuarioId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await prisma.orcamento.delete({
      where: { id }
    });

    res.json({ message: 'Orçamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar orçamento:', error);
    res.status(500).json({ error: 'Erro ao deletar orçamento' });
  }
});

export default router;
