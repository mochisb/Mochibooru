# API alpha v1

## Consultar publicaciones

```http
GET /api/v1/posts?q=landscape%20-dog%20width:>=640&page=1
```

Devuelve `{ posts, hasNext }`. Cada publicación incluye sus etiquetas, metadatos y rutas `thumbnailUrl` y `previewUrl`. Solo devuelve publicaciones publicadas. Comparte el parser, los filtros y los límites de la galería.

Una consulta inválida devuelve `400`; la página debe estar entre 1 y 250.

## Autocompletado

```http
GET /api/v1/tags?q=land
```

Devuelve `{ tags: [{ id, name, category, count }] }`. Busca por prefijo literal, con un máximo de doce resultados. Los recuentos corresponden a publicaciones `safe` publicadas.

## Subir una imagen

```http
POST /api/v1/posts
Content-Type: multipart/form-data; boundary=...
Origin: https://tu-comunidad.example
Cookie: <sesión>
```

| Campo    | Requisito                                               |
| -------- | ------------------------------------------------------- |
| `file`   | Un archivo de imagen.                                   |
| `tags`   | Entre 1 y 50 etiquetas, separadas por espacios o comas. |
| `rating` | `safe`, `questionable` o `explicit`.                    |
| `title`  | Opcional, hasta 160 caracteres.                         |
| `source` | Opcional, URL HTTP/HTTPS de hasta 2048 caracteres.      |

Respuesta `201`:

```json
{ "id": "uuid", "status": "queued", "url": "/posts/uuid" }
```

Errores: `400` formulario inválido, `401` sesión requerida, `403` origen inválido, `409` archivo duplicado, `413` límite de tamaño y `429` límite de 100 subidas por cuenta y hora. La aceptación de la subida no implica que su decodificación vaya a terminar correctamente; la ficha muestra el resultado del worker.

## Medios

```http
GET /media/:id/thumbnail
GET /media/:id/preview
GET /media/:id/original
```

La clasificación de la búsqueda no altera los permisos de la ficha. Los medios no públicos requieren ser propietario o moderador. Devuelve `404` tanto para medios inexistentes como para medios no autorizados. Los originales no están disponibles hasta que su tipo haya sido validado.

## Sesiones y acciones

Better Auth está montado en `/api/auth/*`. La interfaz usa su cliente Svelte para registrarse, iniciar sesión y cerrarla.

Edición, favoritos y moderación usan acciones de formulario de SvelteKit. En esta alpha aún no tienen un contrato REST v1 estable. La API v1 de escritura usa sesiones del mismo origen; tokens personales y permisos para integraciones externas forman parte del roadmap.
