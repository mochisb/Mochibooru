# Arquitectura

## Aplicación modular con dos procesos

La web y el worker comparten contratos TypeScript, PostgreSQL y almacenamiento. SvelteKit se encarga de SSR, navegación, formularios y endpoints; las reglas de autorización y edición están en `packages/core`.

La interfaz usa Svelte 5, Tailwind CSS, Lucide y Bits UI para el diálogo accesible de ayuda. Better Auth gestiona cuentas y sesiones mediante su adaptador Drizzle. La propiedad `role` es asignada por el servidor y no se admite como entrada del cliente.

## Datos

- `user`, `session`, `account`, `verification`: autenticación.
- `posts`: estado, clasificación, autor de la subida, claves de almacenamiento, hash y metadatos.
- `tags`, `post_tags`: relación muchos-a-muchos. El esquema permite categorías general, artist, character, copyright y meta; las nuevas etiquetas se crean como general.
- `post_revisions`: historial de creación, edición y moderación con valores anteriores y posteriores.
- `favorites`: relación única entre usuario y publicación.

Las migraciones SQL se generan con Drizzle Kit y se conservan en `packages/db/migrations`. El historial de migraciones evita repetir cambios ya aplicados. Los cambios de metadatos y sus revisiones se escriben en la misma transacción y bloquean la publicación durante la edición.

## Subida y procesamiento

1. La web exige una sesión y un origen válido, limita el tamaño real del cuerpo y valida los metadatos con Zod.
2. Calcula SHA-256 y almacena el original con una clave UUID propia.
3. Inserta publicación, etiquetas y revisión dentro de una transacción. El hash tiene una restricción única; si la transacción falla, se elimina el objeto recién guardado.
4. La fila `queued` actúa como registro durable del trabajo pendiente. Cada cinco segundos el worker la reconcilia con BullMQ usando el ID de la publicación como ID del trabajo.
5. El worker decodifica la imagen con Sharp, aplica orientación y escribe derivados WebP en claves deterministas. La vista previa llega hasta 1800 px y la miniatura hasta 480 px, sin ampliar imágenes pequeñas.
6. Al terminar pasa a `published`, o a `pending` si se exige revisión.

```text
queued → processing → published
                    → pending → published / rejected
                    → failed → queued (reintento manual)
```

Los fallos transitorios reciben hasta tres intentos con espera exponencial. Un archivo inválido falla definitivamente. La reconciliación también recupera trabajos `processing` antiguos cuando desaparece su entrada de Redis. Los trabajos que ya terminaron o entraron en revisión no vuelven a procesarse.

Los originales conservan sus bytes y animación. Las vistas previas son estáticas, orientadas y sin EXIF. Se admiten JPEG, PNG, WebP, GIF y AVIF, hasta 40 millones de píxeles por imagen/fotograma y 1000 fotogramas; SVG y otros formatos se rechazan aunque el decodificador los soporte.

La transacción SQL y el almacenamiento de objetos no forman una transacción distribuida. Un cierre abrupto entre guardar el objeto y registrar la fila puede dejar un original huérfano. La futura tarea de limpieza deberá contrastar las claves con PostgreSQL y aplicar un margen de antigüedad.

## Permisos

| Operación                     | Visitante | Miembro                          | Moderador / administrador |
| ----------------------------- | --------- | -------------------------------- | ------------------------- |
| Ver publicaciones publicadas  | Sí        | Sí                               | Sí                        |
| Ver publicaciones no públicas | No        | Propias                          | Todas                     |
| Subir y guardar favoritos     | No        | Sí                               | Sí                        |
| Editar metadatos              | No        | Propias, publicadas o pendientes | Sí                        |
| Aprobar o retirar             | No        | No                               | Sí                        |

Las rutas de medios ejecutan la misma comprobación que la ficha. Incluso las peticiones condicionales con ETag comprueban permisos antes de devolver `304`. Los errores internos del procesamiento no se exponen como mensajes técnicos al usuario.

La promoción a administrador se hace mediante CLI. Las sesiones consultan la base de datos sin caché de cookies para reflejar cambios de rol. Los límites de autenticación usan la IP que resuelve SvelteKit; la cabecera interna se sobrescribe en el hook para impedir que el cliente elija el identificador del límite.

## Búsqueda

`packages/search` transforma una consulta en una representación estructurada independiente de SQL. `packages/core` la compila a consultas parametrizadas con `EXISTS` / `NOT EXISTS` para las etiquetas, comparaciones para dimensiones y orden estable por fecha e ID. Solo los operadores validados por el parser entran en la estructura SQL.

La versión alpha usa paginación por desplazamiento acotada y recuentos en consulta. Antes de plantear millones de publicaciones habrá que medir planes con `EXPLAIN ANALYZE`, introducir paginación por cursor y materializar agregados según los resultados. Un buscador externo sería una decisión posterior basada en esas mediciones.

## Distribución

Compose incluye PostgreSQL 17, Redis 7, una tarea de migración, web y worker. Todos los procesos de aplicación se ejecutan con Bun. El almacenamiento local se comparte mediante un volumen; para separar web y worker en distintos servidores se debe configurar S3 o un almacenamiento compartido equivalente.

`GET /api/health` verifica la web y PostgreSQL. La monitorización del worker y de la antigüedad de la cola es un trabajo adicional de operación; el endpoint de salud no representa el estado completo del procesamiento.
