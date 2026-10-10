FROM node:22-alpine

WORKDIR /app
COPY server/package*.json ./server/
RUN npm --prefix server ci --omit=dev --ignore-scripts
COPY server ./server
COPY shared ./shared

ENV PORT=8787
EXPOSE 8787

CMD ["node", "server/analyze-server.mjs"]
