if (!process.env.JWT_SECRET) {
  throw new Error('Falta la variable JWT_SECRET');
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  offlineAfterMs: Number(process.env.OFFLINE_AFTER_MS ?? 120000),
};
