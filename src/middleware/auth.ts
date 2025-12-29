import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tipo: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  let decoded: any;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Configuração inválida de autenticação' });
    }
    decoded = jwt.verify(token, secret);
  } catch (_e) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  try {
    const userId = (decoded as any).userId || (decoded as any).id;
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, email: true, tipo: true, ativo: true }
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    return next();
  } catch (_dbErr) {
    // Fallback de desenvolvimento quando o DB está indisponível
    const allowDev = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN !== 'false';
    if (allowDev) {
      req.user = {
        id: (decoded as any).userId || (decoded as any).id,
        email: (decoded as any).email,
        tipo: (decoded as any).tipo,
      } as any;
      return next();
    }
    return res.status(503).json({ error: 'Serviço indisível' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!roles.includes(req.user.tipo)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};

export { AuthenticatedRequest };
