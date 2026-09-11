# Mochibooru

**Un pequeño universo visual.** Motor booru autohospedable construido con **Bun, TypeScript, Svelte 5 y SvelteKit**.

## Estado: alpha 0.1

La primera entrega implementa un recorrido completo, con datos reales:

- Interfaz responsive en español, temas oscuro/claro y atajo `/` para buscar.
- Registro, inicio/cierre de sesión y roles `member`, `moderator` y `admin` con Better Auth.
- Subidas múltiples con progreso: JPEG, PNG, WebP, GIF y AVIF.
- Originales locales o en almacenamiento S3 compatible, detección de duplicados exactos SHA-256.
- Worker Bun con BullMQ y Sharp: validación, orientación, miniaturas WebP y vistas previas.
- Etiquetas Unicode, autocompletado y búsquedas con exclusiones, dimensiones, clasificación y ordenación.
- Favoritos, ficha de publicación, edición de metadatos e historial de cambios.
- Cola de revisión, aprobación y retirada de publicaciones con permisos comprobados en servidor.
- Migraciones versionadas, Docker Compose y tests unitarios, de integración y navegador.

El alcance de las próximas entregas está en [docs/roadmap.md](docs/roadmap.md).

## Arranque rápido con Docker

Requisitos: **Bun 1.3.14** y **Docker con Compose v2**.

```bash
bun install --frozen-lockfile
bun run setup
docker compose up -d --build
```

Abre **http://localhost:5173**. `setup` crea `.env` con un secreto aleatorio y una ruta local absoluta; conserva cualquier `.env` existente. Compose inicia PostgreSQL y Redis, aplica las migraciones y arranca la web y el worker. Los datos viven en volúmenes persistentes.

Crea tu cuenta desde `/login?mode=register` y promuévela a administradora:

```bash
docker compose exec web bun scripts/promote-admin.ts tu@correo.com
```

Recarga la página para ver la sección de moderación. Ninguna cuenta obtiene privilegios automáticamente al registrarse.

## Desarrollo con Bun

Desde la raíz del repositorio:

```bash
bun install --frozen-lockfile
bun run setup
docker compose up -d db redis
bun run db:migrate
bun run dev
```

En otra terminal:

```bash
bun run worker
```

La web se sirve en **http://localhost:5173**. También puedes usar PostgreSQL y Redis instalados localmente: configura `DATABASE_URL` y `REDIS_URL` en `.env`.

Para promover una cuenta desde el host:

```bash
bun run admin:promote tu@correo.com
```

### Build de producción

```bash
bun run build
bun run start
```

El servidor generado por `adapter-node` se ejecuta **con Bun**, igual que el worker. `PORT` y `ORIGIN` deben corresponder con la instalación; el `.env` generado usa el puerto 5173. El worker se inicia en su propio proceso.

## Configuración

| Variable             | Función                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`       | Conexión PostgreSQL.                                                       |
| `REDIS_URL`          | Redis para las colas.                                                      |
| `BETTER_AUTH_SECRET` | Secreto de sesiones; lo genera `bun run setup`.                            |
| `ORIGIN`             | URL pública exacta, incluyendo esquema y puerto.                           |
| `PORT`               | Puerto de la web compilada; Compose usa 3000 internamente.                 |
| `SITE_NAME`          | Nombre de la comunidad.                                                    |
| `REGISTRATION_OPEN`  | `true` o `false`; apertura del registro.                                   |
| `REQUIRE_APPROVAL`   | `true` para revisar nuevas publicaciones y ediciones de miembros.          |
| `MAX_UPLOAD_MB`      | Tamaño máximo por imagen; 20 MB por defecto.                               |
| `STORAGE_DRIVER`     | `local` o `s3`.                                                            |
| `STORAGE_PATH`       | Ruta absoluta compartida entre web y worker para almacenamiento local.     |
| `S3_*`               | Endpoint opcional, región, bucket y credenciales; consulta `.env.example`. |

Reinicia web y worker tras cambiar la configuración. Para S3, crea el bucket y permite al servicio leer, escribir y eliminar objetos. Los medios se sirven a través de la aplicación para aplicar los permisos también a las imágenes originales.

`BODY_SIZE_LIMIT` es el techo de transporte del servidor compilado. El `.env` y la imagen Docker permiten aproximadamente 101 MB; la aplicación aplica además `MAX_UPLOAD_MB`, incluso con peticiones sin `Content-Length`.

## Búsquedas

```text
landscape sunset
cat -dog
pixel_art rating:safe
rating:any type:animated
width:>=1920 height:>=1080
sort:score
```

- Las etiquetas incluidas se combinan con AND; `-etiqueta` excluye coincidencias.
- Clasificaciones: `safe`, `questionable`, `explicit`, `any`. Por defecto: `safe`.
- Tipos: `image` para imágenes estáticas, `animated` para imágenes animadas.
- Dimensiones: `=`, `>`, `>=`, `<`, `<=`.
- Orden: `newest`, `oldest`, `score` (número de favoritos).
- Etiquetas de varias palabras usan guiones bajos: `pixel_art`.
- Los errores de sintaxis se muestran al usuario, sin ignorar filtros silenciosamente.

La paginación actual está limitada a 250 páginas de 36 publicaciones; refina la consulta para explorar más resultados. Los recuentos del autocompletado se calculan sobre publicaciones `safe` publicadas.

## Comandos

| Comando                    | Descripción                                                |
| -------------------------- | ---------------------------------------------------------- |
| `bun run dev`              | SvelteKit con recarga en desarrollo.                       |
| `bun run worker`           | Procesamiento multimedia.                                  |
| `bun run check`            | Comprobación de Svelte y TypeScript de todo el workspace.  |
| `bun run test`             | Tests unitarios sin servicios externos.                    |
| `bun run test:integration` | Reintentos e idempotencia con una base PostgreSQL migrada. |
| `bun run test:e2e`         | Recorrido de navegador con web y worker activos.           |
| `bun run db:generate`      | Generar migraciones después de cambiar el esquema.         |
| `bun run db:migrate`       | Aplicar migraciones pendientes.                            |
| `bun run format`           | Aplicar Prettier.                                          |
| `bun run format:check`     | Verificar formato.                                         |

Antes del test de navegador:

```bash
bun x playwright install chromium
```

Usa una **instalación de pruebas** con `REGISTRATION_OPEN=true` y `REQUIRE_APPROVAL=false`. El test crea cuentas y publicaciones, y promueve su propia cuenta para comprobar permisos. La base indicada por `DATABASE_URL` debe ser la misma que utiliza la web; `ORIGIN` o `E2E_BASE_URL` seleccionan la URL del navegador. Los tests de integración limpian sus registros; el test E2E conserva sus datos para diagnóstico.

## Estructura

```text
apps/web/             SvelteKit, interfaz, autenticación y endpoints
apps/worker/          Worker multimedia
packages/db/          Esquema Drizzle y migraciones SQL
packages/core/        Publicaciones, permisos y colas
packages/search/      Parser de búsquedas
packages/shared/      Validaciones y configuración
packages/storage/     Adaptadores local y S3
tests/                Pruebas de medios, integración y E2E
infra/docker/         Imagen Bun
docs/                 Arquitectura, operación y roadmap
```

Más información: [arquitectura](docs/architecture.md) · [operación y copias de seguridad](docs/operations.md) · [API](docs/api.md).
