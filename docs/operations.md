# Operación

## Configuración inicial

1. Ejecuta `bun run setup` y ajusta `.env`.
2. Define `ORIGIN` con la URL real. Para una instalación pública, termina HTTPS en tu proxy.
3. Configura `POSTGRES_PASSWORD` antes de crear el volumen de base de datos. En desarrollo local, actualiza también `DATABASE_URL`.
4. Inicia `docker compose up -d --build`, crea una cuenta y ejecuta `admin:promote`.
5. Activa `REQUIRE_APPROVAL=true` si la comunidad revisa las publicaciones antes de mostrarlas.

Compose publica PostgreSQL y Redis solo en loopback para facilitar el desarrollo local. La web queda en el puerto 5173 del host. Para un proxy inverso, ajusta la publicación del puerto según tu despliegue.

Si necesitas la IP original detrás de un proxy, configura las variables de `adapter-node`, como `ADDRESS_HEADER` y `XFF_DEPTH`, de acuerdo con tu infraestructura. La cabecera elegida debe ser sobrescrita por un proxy de confianza y la aplicación debe recibir tráfico únicamente desde ese proxy.

## Consultar estado

```bash
docker compose ps
docker compose logs --follow web worker
```

`/api/health` devuelve `200` si PostgreSQL responde. Revisa los logs del worker cuando una subida permanece en cola. La web puede aceptar subidas con Redis temporalmente indisponible: las filas pendientes se reconciliarán cuando vuelva el servicio.

## Actualizaciones

Conserva una copia consistente antes de aplicar una versión con migraciones. Para actualizar desde una nueva revisión del código:

```bash
docker compose stop web worker
docker compose build
docker compose run --rm migrate
docker compose up -d web worker
```

Las migraciones se ejecutan explícitamente; no se usa `drizzle-kit push` en despliegues. Si una actualización exige cambios incompatibles, la restauración requiere la copia y la versión de aplicación correspondientes.

## Copia consistente: PostgreSQL y medios locales

Ejecuta desde la raíz. Usa una carpeta nueva para cada copia:

```bash
mkdir -p backups/mi-copia
docker compose stop web worker
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/mi-copia/database.dump
docker compose run --rm --no-deps -T web tar -C /data/media -czf - . > backups/mi-copia/media.tar.gz
docker compose up -d web worker
```

Comprueba que ambos comandos de copia terminaron correctamente antes de dar el respaldo por válido. Conserva junto a la copia el `.env` de la instalación y la revisión del código, en un destino privado. `database.dump` contiene las cuentas y sesiones; el archivo de medios contiene originales y derivados.

La pausa de web y worker evita cambios entre el volcado SQL y la copia de medios. Redis es reconstruible a partir de las filas pendientes de PostgreSQL; no es la fuente de verdad de los trabajos.

## Restauración en una instalación separada

Prepara la misma versión de aplicación, configura su `.env` y copia los archivos del respaldo. Mantén web y worker detenidos hasta terminar:

```bash
docker compose up -d db redis
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < backups/mi-copia/database.dump
docker compose run --rm --no-deps -T web tar -C /data/media -xzf - < backups/mi-copia/media.tar.gz
docker compose run --rm migrate
docker compose up -d web worker
```

Comprueba inicio de sesión, búsqueda, original de una publicación y nueva subida. Conserva el respaldo hasta haber comprobado ese recorrido en el destino.

Para S3, sustituye el archivo de medios por una copia o instantánea consistente del bucket. Web y worker deben apuntar al bucket restaurado, con las mismas claves que aparecen en PostgreSQL.

## Alcance operativo de la alpha

La imagen Compose, la recuperación con volúmenes Docker y el adaptador S3 requieren una prueba en el entorno de despliegue concreto. Los tests automatizados del proyecto cubren almacenamiento local, migraciones, procesamiento, interfaz y permisos. El roadmap incluye tareas de limpieza de archivos huérfanos, métricas del worker y actualizaciones guiadas.
