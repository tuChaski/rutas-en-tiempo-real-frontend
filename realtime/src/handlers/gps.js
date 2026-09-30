import { upsert, remove, publicView } from '../services/fleetState.js';

export function positionHandler(io) {
  return (req, res) => {
    const { lat, lng } = req.body ?? {};
    const speed = Number(req.body?.speed ?? 0);

    const validCoords =
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    if (!validCoords || !Number.isFinite(speed) || speed < 0) {
      return res.status(400).json({ error: 'Datos GPS inválidos' });
    }

    const { micro_id, ruta_id } = req.driver;
    const unit = upsert({ microId: micro_id, rutaId: ruta_id, lat, lng, speed });
    io.to(`ruta:${ruta_id}`).emit('micro:position', publicView(unit));
    res.status(202).json({ ok: true });
  };
}

export function stopHandler(io) {
  return (req, res) => {
    const unit = remove(req.driver.micro_id);
    if (unit) io.to(`ruta:${unit.rutaId}`).emit('micro:stopped', { microId: unit.microId });
    res.json({ ok: true });
  };
}
