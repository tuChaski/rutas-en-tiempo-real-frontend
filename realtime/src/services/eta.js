const MIN_SPEED = 2; // m/s, evita ETA infinito con el micro detenido

export function haversineMeters(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function avgSpeed(samples) {
  if (!samples.length) return 0;
  return samples.reduce((s, v) => s + v, 0) / samples.length;
}

export function etaSeconds(distanceMeters, samples) {
  const v = Math.max(avgSpeed(samples), MIN_SPEED);
  return Math.round(distanceMeters / v);
}
