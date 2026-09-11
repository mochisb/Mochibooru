FROM oven/bun:1.3.14 AS application
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run build \
    && mkdir -p /data/media && chown -R bun:bun /data /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# App validation enforces MAX_UPLOAD_MB; this is the transport ceiling.
ENV BODY_SIZE_LIMIT=105906176
USER bun
EXPOSE 3000
CMD ["bun", "apps/web/build/index.js"]
