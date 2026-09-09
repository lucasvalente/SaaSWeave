FROM node:22.14.0-alpine3.21
ENV COREPACK_DEFAULT_TO_LATEST=0
RUN npm install --global pnpm@9.15.4 && pnpm --version
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
WORKDIR /workspace
RUN chown sandbox:sandbox /workspace
USER sandbox
ENTRYPOINT ["pnpm"]
