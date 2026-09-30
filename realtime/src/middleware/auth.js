import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireDriver(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const claims = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    if (claims.role !== 'conductor' || !claims.micro_id || !claims.ruta_id) {
      return res.status(403).json({ error: 'No autorizado para transmitir' });
    }
    req.driver = claims;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
