# Arquitectura

## Estado

Este documento describe la estructura objetivo del monorepo. Los directorios `backend/`, `realtime/`, `mobile/` y `web-admin/` todavía deben incorporarse; los nombres de servicios, puertos y contratos son convenciones iniciales que deben confirmarse al implementar cada aplicación.

## Componentes

- `mobile/`: aplicación React Native para pasajeros y operadores.
- `web-admin/`: panel administrativo React servido por Vite en el puerto 4173 dentro de Docker.
- `backend/`: API Laravel; el contenedor debe escuchar en el puerto 8000.
- `realtime/`: servidor Node.js para eventos de ubicación por Socket.IO en el puerto 3001.
- `docker/`: PostgreSQL con PostGIS y configuración Compose local/producción.
- `deploy/`: proxy Nginx, terminación TLS y automatización de despliegue.

## Flujo de ubicación

1. El dispositivo autorizado obtiene la ubicación del bus.
2. `realtime/` publica la ubicación actual a los clientes suscritos.
3. `backend/` gestiona usuarios, autorización y datos persistentes en PostgreSQL/PostGIS.
4. La aplicación móvil y el panel web consultan la API y reciben actualizaciones en tiempo real.

## Red y puertos

Nginx es el único servicio publicado: HTTP en el puerto 80 y HTTPS en el 443 en producción. Enruta `/api/` a `backend:8000`, `/socket.io/` a `realtime:3001` y el resto a `web-admin:4173`. Los servicios internos y los puertos deben mantenerse alineados con los Dockerfiles de cada aplicación.

## Desarrollo y despliegue

Copia `.env.example` a `.env`, configura `APP_KEY` y `DB_PASSWORD`, y ejecuta `docker compose --env-file .env -f docker/docker-compose.yml up --build`. En producción, `deploy/scripts/deploy.sh` combina el Compose base con `docker/docker-compose.prod.yml`. Para habilitar TLS, configura `DOMAIN` y `CERTBOT_EMAIL`, publica el puerto 80 y ejecuta `deploy/scripts/certbot.sh`.
