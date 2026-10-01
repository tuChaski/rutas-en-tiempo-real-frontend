# Rutas en Tiempo Real

Aplicación para que los pasajeros del transporte público de **Tacna** vean dónde está su micro y cuánto falta para que llegue. La ubicación se obtiene del GPS del celular del conductor, sin instalar dispositivos GPS en los micros.

> **Pregunta que responde la app:** "¿Dónde está mi micro y cuánto falta para que llegue?"

---

## ⚠️ Estado actual de este repositorio

**Este repositorio es hoy un monorepo**: contiene los cuatro componentes de la aplicación. Los repositorios separados (`-backend`, `-movil`, `-infraestructura`, `-docs`) existen en la organización pero **aún están vacíos**.

| Componente | Ruta aquí | Repositorio destino | Estado |
|---|---|---|---|
| API Laravel | `backend/` | `rutas-en-tiempo-real-backend` | esqueleto de Laravel 13 |
| Servidor de tiempo real | `realtime/` | `rutas-en-tiempo-real-backend` | **funcional** |
| Web pública + panel | `web/` | este repositorio | esqueleto de React |
| App Android | `mobile/` | `rutas-en-tiempo-real-movil` | esqueleto de Expo |
| Docker, Nginx, despliegue | `docker/`, `deploy/` | `rutas-en-tiempo-real-infraestructura` | funcional |
| Contratos y arquitectura | `docs/` | `rutas-en-tiempo-real-docs` | funcional |

Mientras dure la transición, este README describe **el contenido real del monorepo**. Cuando se complete la separación, cada repositorio tendrá su propio README.

---

## 1. Cómo funciona

```
Celular del conductor ──(envía su GPS cada 3-5 s)──► Servidor de tiempo real
                                                            │
                                                            ▼
Pasajero (app o web) ◄──(recibe la posición al instante)────┘
        │
        └──(consulta rutas, login, datos)──► API (Laravel) ──► Base de datos
```

1. El **administrador** registra empresas, rutas, micros y conductores desde el panel web.
2. El **conductor** abre la app en "Modo Conductor", inicia su recorrido y su celular envía la ubicación.
3. El **pasajero** elige una ruta, ve los micros en el mapa y obtiene un tiempo estimado de llegada.

---

## 2. Estructura

```
.
├── backend/          API Laravel 13 (PHP 8.3) — esqueleto, sin lógica de negocio
├── realtime/         Servidor de tiempo real Node.js 24 — ✅ implementado
├── web/              React 19 + Vite + TypeScript — esqueleto
├── mobile/           React Native + Expo SDK 57 — esqueleto
├── docker/           Docker Compose: PostgreSQL/PostGIS + servicios
├── deploy/           Proxy Nginx, certificados y scripts de despliegue
├── docs/             Arquitectura, contrato OpenAPI y diagramas
└── .github/workflows/  CI (tests) y CD (despliegue)
```

---

## 3. Componentes y puertos

| Servicio | Puerto | Puerto en contenedor | Estado |
|---|---|---|---|
| `db` — PostgreSQL 16 + PostGIS | — | 5432 | funcional |
| `backend` — API Laravel | 8000 | 8000 | esqueleto |
| `realtime` — Node.js + Socket.io | 3001 | 3001 | funcional |
| `web` — React compilado | 5173 (dev) | 4173 | esqueleto |
| `nginx` — único servicio público | 80 / 443 | — | funcional |

Nginx enruta: `/api/` → `backend:8000`, `/socket.io/` → `realtime:3001`, todo lo demás → `web:4173`.

---

## 4. Puesta en marcha

### Opción A — Docker (todo junto)

```bash
cp .env.example .env
# Edita .env y define al menos: APP_KEY, DB_PASSWORD, JWT_SECRET

docker compose --env-file .env -f docker/docker-compose.yml up --build
```

### Opción B — Cada servicio por separado

**`realtime/` — el único componente con lógica real:**

```bash
cd realtime
cp .env.example .env        # define JWT_SECRET (mismo valor que backend/.env)
npm ci
npm run dev                 # node --watch --env-file=.env
npm test                    # node --test
```

**`backend/`:**

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve           # http://localhost:8000
php artisan test
```

**`web/`:**

```bash
cd web
npm ci
npm run dev                 # Vite en http://localhost:5173
npm run lint                # oxlint
npm run build
```

**`mobile/`:**

```bash
cd mobile
npm ci
npm start                   # requiere development build (ver más abajo)
npm run android
```

---

## 5. Variables de entorno

### Raíz — `.env.example`

| Variable | Por defecto | Para qué |
|---|---|---|
| `APP_KEY` | — | clave de cifrado de Laravel (**obligatoria**) |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | `rutatacna` | credenciales de PostgreSQL |
| `JWT_SECRET` | — | **debe ser idéntico** en `backend` y `realtime` |
| `REALTIME_PORT` | `3001` | puerto del servidor de tiempo real |
| `CORS_ORIGIN` | `http://localhost:5173` | origen permitido del navegador |
| `OFFLINE_AFTER_MS` | `120000` | tras 2 min sin señal, el micro pasa a `sin_conexion` |
| `HTTP_PORT` / `HTTPS_PORT` | `80` / `443` | puertos publicados por Nginx |
| `DOMAIN` / `CERTBOT_EMAIL` | — | necesarios para emitir el certificado TLS |
| `VITE_API_URL` | `http://localhost/api` | URL de la API que compila la web |
| `VITE_REALTIME_URL` | `http://localhost` | URL del servidor de tiempo real |

### `realtime/.env`

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `3001` | puerto de escucha |
| `JWT_SECRET` | — | **obligatoria**; el proceso lanza error si falta |
| `CORS_ORIGIN` | `*` | origen permitido |
| `OFFLINE_AFTER_MS` | `120000` | umbral para marcar un micro sin conexión |

### `backend/.env`

El `.env.example` es el de Laravel por defecto y usa **SQLite**. Para trabajar con PostGIS hay que cambiarlo a PostgreSQL:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=rutatacna
DB_USERNAME=rutatacna
DB_PASSWORD=<la de tu .env raíz>
```

> **Nunca subas archivos `.env`.** Cada repo trae su `.env.example`.

---

## 6. API de tiempo real

Implementada en `realtime/`, es la parte con lógica propia del proyecto.

### HTTP

| Método | Ruta | Auth | Respuesta |
|---|---|---|---|
| `GET` | `/health` | no | `{ "status": "ok" }` |
| `POST` | `/tracking/position` | conductor | `202 { "ok": true }` |
| `POST` | `/tracking/stop` | conductor | `200 { "ok": true }` |

`POST /tracking/position` recibe `{ "lat": number, "lng": number, "speed": number }` y **rechaza** coordenadas fuera de rango o velocidades negativas con `400`.

### WebSocket (Socket.io)

| Evento | Dirección | Datos |
|---|---|---|
| `route:join` | cliente → servidor | `rutaId` → responde con las unidades de esa ruta |
| `route:leave` | cliente → servidor | `rutaId` |
| `eta:request` | cliente → servidor | `{ microId, lat, lng }` → responde con `meters`, `seconds`, `estimated` |
| `micro:position` | servidor → cliente | `{ microId, rutaId, lat, lng, speed, status, lastSeen }` |
| `micro:offline` | servidor → cliente | `{ microId, lastSeen }` |
| `micro:stopped` | servidor → cliente | `{ microId }` |

Los pasajeros se agrupan en **salas** (`ruta:{rutaId}`): cada uno solo recibe las posiciones de su ruta.

### Autenticación del conductor

`realtime/src/middleware/auth.js:4` — header `Authorization: Bearer <token>`, firmado con **HS256**. El token debe traer `role: "conductor"`, `micro_id` y `ruta_id`; si falta cualquiera de los tres responde `403`.

### Límite de peticiones

`realtime/src/middleware/rateLimit.js:3` — **60 peticiones por minuto por micro**. Con el GPS cada 3-5 s queda margen.

### Cálculo del ETA

`realtime/src/services/eta.js:19` — distancia en línea recta (haversine) dividida entre la velocidad promedio:

```js
segundos = distancia_metros / max(velocidad_promedio, 2)
```

Se usa el **promedio de las últimas 60 muestras de velocidad**, no la instantánea, y el mínimo de `2 m/s` evita un ETA infinito cuando el micro está detenido. Siempre se devuelve marcado como `estimated: true`. **No considera tráfico.**

---

## 7. Decisiones del proyecto

- **GPS del celular del conductor** en lugar de dispositivos dedicados, para reducir costos.
- **Servidor de tiempo real separado** de Laravel: Laravel atiende cada petición desde cero, mientras que el tiempo real necesita recordar posiciones y mantener conexiones abiertas.
- **El conductor envía su GPS por HTTP `POST`** cada 3-5 s (más robusto en celulares que una conexión permanente); el pasajero recibe por WebSocket.
- **ETA simple en el MVP:** distancia dividida entre la velocidad promedio reciente. Sin tráfico.
- **Mapas con OpenStreetMap:** Leaflet en web y MapLibre en el móvil.
- **Alcance inicial:** solo Tacna, Android primero. iOS y funciones Premium (aforo, alertas, historial) quedan para después.

---

## 8. Problemas conocidos

Detectados al auditar el repositorio. Ninguno bloquea leer el código, pero sí levantan el sistema completo con Docker.

1. **`docker/docker-compose.yml` apunta a `../web-admin`, una carpeta que no existe** (la carpeta real es `web`). El servicio `web-admin` y el `nginx` no pueden construir la imagen.
2. **Faltan los `Dockerfile` de `backend/` y de `web/`.** Solo existe `realtime/Dockerfile`.
3. **El job `web-admin` de `.github/workflows/tests.yml` nunca se ejecuta**: detecta `web-admin/package-lock.json`, que no existe.
4. **`backend/.env.example` sigue con SQLite**, aunque el compose configura `DB_CONNECTION=pgsql`.
5. **Faltan las dependencias previstas** en `backend/` (`jwt-auth`, Magellan, L5-Swagger) y en `web/` (Tailwind, React Router, Axios, Leaflet, Socket.io-client) y en `mobile/` (`expo-location`, `expo-task-manager`, `expo-secure-store`, MapLibre, Socket.io-client). `docs/architecture.md:5` ya advierte que la estructura es objetivo, no estado actual.
6. **`nginx` no tiene TLS.** `deploy/scripts/certbot.sh` genera `deploy/nginx/ssl.conf`, pero `docker-compose.prod.yml` publica el 443 sin montar ese archivo.

---

## 9. Comandos útiles

```bash
# tests (lo que corre la CI)
cd realtime && npm test          # node --test
cd backend  && php artisan test
cd web      && npm run lint

# Docker
docker compose --env-file .env -f docker/docker-compose.yml ps
docker compose --env-file .env -f docker/docker-compose.yml logs -f realtime
```

---

## 10. Equipo

| Integrante | Rol prioritario |
|---|---|
| Royfrankly Navarro | Coordinación general, Backend y DevOps |
| David Montador | Arquitectura de software y módulo GPS en tiempo real |
| Alex Huaracha | Diseño UI/UX y desarrollo Frontend/Móvil |
| Edison Catari | Calidad (QA), pruebas y automatización |

Todos participan en todas las áreas; el rol prioritario indica quién lidera cada una.

---

## 11. Glosario

- **API REST:** forma en que las apps piden y envían datos al servidor mediante direcciones web.
- **JWT (token):** código que el servidor entrega al iniciar sesión. El token del conductor incluye `role`, `micro_id` y `ruta_id`.
- **WebSocket / Socket.io:** conexión que se mantiene abierta para que el servidor "empuje" datos nuevos al instante.
- **Sala (room):** grupo de pasajeros conectados a la misma ruta; solo reciben posiciones de esa ruta.
- **ETA:** tiempo estimado de llegada.
- **Foreground service:** notificación fija en Android que permite al Modo Conductor seguir enviando GPS con la pantalla apagada.
- **Desarrollo vs. producción:** `docker-compose.yml` para desarrollo local; `docker-compose.prod.yml` se sobrepone en producción.

---

## 12. Enlaces

| Repositorio | Propósito |
|---|---|
| `rutas-en-tiempo-real-frontend` | Este repositorio. Web y panel de administración. |
| `rutas-en-tiempo-real-backend` | API Laravel y servidor de tiempo real. |
| `rutas-en-tiempo-real-movil` | App Android (Pasajero y Modo Conductor). |
| `rutas-en-tiempo-real-infraestructura` | Docker, k3s, Traefik y despliegue. |
| `rutas-en-tiempo-real-docs` | Informe, requisitos, contratos y cronograma. |

Tablero de tareas: [Planificación rutas-en-tiempo-real](https://github.com/orgs/tuChaski/projects/1)