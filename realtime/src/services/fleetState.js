const units = new Map();
const WINDOW = 60;

export function upsert({ microId, rutaId, lat, lng, speed }) {
  const prev = units.get(microId);
  const samples = [...(prev?.samples ?? []), speed].slice(-WINDOW);
  const unit = { microId, rutaId, lat, lng, speed, samples, status: 'activo', lastSeen: Date.now() };
  units.set(microId, unit);
  return unit;
}

export const get = (microId) => units.get(microId);

export function remove(microId) {
  const unit = units.get(microId);
  units.delete(microId);
  return unit;
}

export function publicView({ microId, rutaId, lat, lng, speed, status, lastSeen }) {
  return { microId, rutaId, lat, lng, speed, status, lastSeen };
}

export function snapshotByRoute(rutaId) {
  return [...units.values()]
    .filter((u) => String(u.rutaId) === String(rutaId))
    .map(publicView);
}

export function sweepOffline(now, limitMs) {
  const changed = [];
  for (const u of units.values()) {
    if (u.status === 'activo' && now - u.lastSeen > limitMs) {
      u.status = 'sin_conexion';
      changed.push(u);
    }
  }
  return changed;
}
