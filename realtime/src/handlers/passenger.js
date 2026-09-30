import { get, snapshotByRoute } from '../services/fleetState.js';
import { haversineMeters, etaSeconds } from '../services/eta.js';

export function registerPassengerHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('route:join', (rutaId, ack) => {
      socket.join(`ruta:${rutaId}`);
      ack?.({ units: snapshotByRoute(rutaId) });
    });

    socket.on('route:leave', (rutaId) => socket.leave(`ruta:${rutaId}`));

    socket.on('eta:request', ({ microId, lat, lng } = {}, ack) => {
      const unit = get(microId);
      if (!unit || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return ack?.({ error: 'Unidad no disponible' });
      }
      const meters = haversineMeters(unit, { lat, lng });
      ack?.({
        microId,
        meters: Math.round(meters),
        seconds: etaSeconds(meters, unit.samples),
        estimated: true,
        status: unit.status,
        lastSeen: unit.lastSeen,
      });
    });
  });
}
