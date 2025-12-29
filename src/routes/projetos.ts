import { assertEstudioForUsuario } from '../services/studioContext';
import express from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticateToken, requireRole } from '../middleware/auth';
import { assertCanCreateProjeto } from '../services/entitlements';

const router: express.Router = express.Router();

router.get('/meus/projetos', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
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

    const projetos = await prisma.projeto.findMany({
      where: { estudioId: estudio.id },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        imagens: true,
        videos: true,
        categoria: true,
        tags: true,
        destaque: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
      orderBy: { criadoEm: 'desc' }
    });

    res.json({ projetos });
  } catch (error) {
    console.error('Erro ao buscar meus projetos:', error);
    res.status(500).json({ error: 'Erro ao buscar projetos' });
  }
});

const projetoSchema = z.object({
  titulo: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  descricao: z.string().optional(),
  imagens: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  categoria: z.enum(['TRADICIONAL', 'REALISTA', 'GEOMETRICO', 'AQUARELA', 'BLACKWORK', 'OLD_SCHOOL', 'NEW_SCHOOL', 'JAPONESA', 'TRIBAL', 'LETTERING']).optional(),
  tags: z.array(z.string()).optional(),
  destaque: z.boolean().optional(),
  ativo: z.boolean().optional(),
});

router.get('/estudio/:estudioId', async (req, res) => {
  try {
    const { estudioId } = req.params;
    const { categoria, destaque } = req.query;

    const where: any = { estudioId, ativo: true };

    if (categoria) where.categoria = categoria;
    if (destaque === 'true') where.destaque = true;

    const projetos = await prisma.projeto.findMany({
      where,
      select: {
        id: true,
        titulo: true,
        descricao: true,
        imagens: true,
        videos: true,
        categoria: true,
        tags: true,
        destaque: true,
        criadoEm: true,
      },
      orderBy: [{ destaque: 'desc' }, { criadoEm: 'desc' }]
    });

    res.json({ projetos });
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ error: 'Erro ao buscar projetos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projeto = await prisma.projeto.findUnique({
      where: { id, ativo: true },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        imagens: true,
        videos: true,
        categoria: true,
        tags: true,
        destaque: true,
        criadoEm: true,
        estudio: { select: { id: true, nome: true, telefone: true, whatsapp: true, email: true } }
      }
    });
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json({ projeto });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ error: 'Erro ao buscar projeto' });
  }
});

router.post('/', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
  try {
    const data = projetoSchema.parse(req.body);
    const ctx = await assertEstudioForUsuario(req.user.id);
      if ('error' in ctx) return res.status(404).json({ error: ctx.error });
      const estudio = await prisma.estudio.findUnique({ where: { id: ctx.estudioId }, select: { id: true } });
    if (!estudio) return res.status(404).json({ error: 'Estúdio não encontrado' });

    const ent = await assertCanCreateProjeto(estudio.id);
    if (!ent.ok) return res.status(402).json({ error: ent.message, code: ent.code });

    const projeto = await prisma.projeto.create({
      data: { ...data, estudioId: estudio.id },
      select: { id: true, titulo: true, descricao: true, imagens: true, videos: true, categoria: true, tags: true, destaque: true, criadoEm: true }
    });

    res.status(201).json({ message: 'Projeto criado com sucesso', projeto });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ error: 'Erro ao criar projeto' });
  }
});

router.put('/:id', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
  try {
    const { id } = req.params;
    const data = projetoSchema.partial().parse(req.body);

    const projeto = await prisma.projeto.findUnique({
      where: { id },
      select: { estudio: { select: { usuarioId: true } } }
    });

    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    if (projeto.estudio.usuarioId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

    const updatedProjeto = await prisma.projeto.update({
      where: { id },
      data,
      select: { id: true, titulo: true, descricao: true, imagens: true, videos: true, categoria: true, tags: true, destaque: true, atualizadoEm: true }
    });

    res.json({ message: 'Projeto atualizado com sucesso', projeto: updatedProjeto });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ error: 'Erro ao atualizar projeto' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['TATUADOR']), async (req: any, res) => {
  try {
    const { id } = req.params;

    const projeto = await prisma.projeto.findUnique({
      where: { id },
      select: { estudio: { select: { usuarioId: true } } }
    });
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    if (projeto.estudio.usuarioId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

    await prisma.projeto.update({ where: { id }, data: { ativo: false } });
    res.json({ message: 'Projeto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    res.status(500).json({ error: 'Erro ao deletar projeto' });
  }
});

export default router;
