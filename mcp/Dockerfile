# The Railway image for mcp/http.mjs: the MCP server's light tools over HTTP (list_designs, research
# trending/topic/comments). Not the editing toolkit: no Remotion, Chromium or footage, so it installs
# only the two MCP packages and the research script's Python deps. Built from the repo root (railway.json).
FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# Three tries: Railway's first build died on a cut-off yt-dlp download (pip's hash check caught it).
RUN for i in 1 2 3; do \
      pip3 install --no-cache-dir --break-system-packages --retries 5 --timeout 60 "yt-dlp[default]" feedparser && exit 0; \
      echo "pip install failed (try $i of 3)"; sleep 10; \
    done; exit 1

WORKDIR /app
# Same versions as package.json pins.
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund @modelcontextprotocol/sdk@1.32.1 zod@4.5.4

COPY mcp ./mcp
COPY scripts/research.py scripts/listing-prep.mjs ./scripts/
COPY src/designs ./src/designs
# list_designs reads only the manifests.
RUN find src/designs -type f ! -name template.json -delete

ENV PYTHON=python3 NODE_ENV=production
# research.py writes under out/; the rest of /app stays root-owned and read-only to the server.
RUN mkdir -p out && chown node:node out
USER node
CMD ["node", "mcp/http.mjs"]
