import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { authLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3334;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET ausente nas variáveis de ambiente');
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

// Sprint 5: rate limit para reduzir abuso (especialmente rotas públicas)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PER_MINUTE || '120'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limit apenas em rotas públicas
app.use('/api/public', publicLimiter);
app.use('/api/contatos', publicLimiter);
app.use('/api/orcamentos', publicLimiter);

// Stripe webhook precisa de body RAW e deve vir antes do json parser
import stripeWebhookRoutes from './routes/stripeWebhook';
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// JSON parser para o resto
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos de upload (local)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
import authRoutes from './routes/auth';
import estudiosRoutes from './routes/estudios';
import projetosRoutes from './routes/projetos';
import depoimentosRoutes from './routes/depoimentos';
import orcamentosRoutes from './routes/orcamentos';
import uploadRoutes from './routes/upload';
import metricasRoutes from './routes/metricas';
import contatosRoutes from './routes/contatos';
import planosRoutes from './routes/planos';
import superAdminRoutes from './routes/superAdmin';
import billingRoutes from './routes/billing';
import dominiosRoutes from './routes/dominios';
import equipeRoutes from './routes/equipe';
import publicRoutes from './routes/public';

app.use('/api/auth', authRoutes);
app.use('/api/estudios', estudiosRoutes);
app.use('/api/projetos', projetosRoutes);
app.use('/api/depoimentos', depoimentosRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/contatos', contatosRoutes);
app.use('/api/planos', planosRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dominios', dominiosRoutes);
app.use('/api/equipe', equipeRoutes);
app.use('/api/public', publicRoutes);

app.use(notFound);
app.use(errorHandler);

// Seed de planos default em dev/test
async function ensureDefaultPlans() {
  const count = await prisma.plano.count();
  if (count > 0) return;

  await prisma.plano.createMany({
    data: [
      {
        nome: 'Starter',
        descricao: 'Para começar com um portfólio profissional e receber contatos.',
        preco: 39,
        stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || null,
        recursos: ['1 template', 'Subdomínio', 'Formulário de contato', 'WhatsApp'],
        limiteProjetos: 6,
        limiteDepoimentos: 6,
        limiteOrcamentosMensal: 40,
        limiteUsuarios: 1,
        permiteTemplatesPremium: false,
        ativo: true,
      } as any,
      {
        nome: 'Pro',
        descricao: 'Para tatuadores que querem mais conversão e domínio próprio.',
        preco: 79,
        stripePriceId: process.env.STRIPE_PRICE_ID_PROFISSIONAL || null,
        recursos: ['5 templates', 'Domínio próprio', 'SEO local', 'WhatsApp inteligente'],
        limiteProjetos: 30,
        limiteDepoimentos: 20,
        limiteOrcamentosMensal: 200,
        limiteUsuarios: 1,
        permiteTemplatesPremium: true,
        ativo: true,
      } as any,
      {
        nome: 'Studio',
        descricao: 'Para estúdios com vários artistas e operação mais intensa.',
        preco: 149,
        stripePriceId: process.env.STRIPE_PRICE_ID_PREMIUM || null,
        recursos: ['Tudo do Pro', 'Equipe/assentos', 'Relatórios', 'Funil de orçamentos'],
        limiteProjetos: 999,
        limiteDepoimentos: 999,
        limiteOrcamentosMensal: 9999,
        limiteUsuarios: 5,
        permiteTemplatesPremium: true,
        ativo: true,
      } as any,
    ],
  });
}

ensureDefaultPlans()
  .catch((e) => console.error('[seed] Falha ao garantir planos default', e));

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
