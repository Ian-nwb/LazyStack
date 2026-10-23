import { ProjectSettings, CartApp, SelectedDatabase } from '../../../src/types'

export function generateDockerCompose(settings: ProjectSettings): string {
  const activeDbs = settings.databases.filter(d => d.enabled)
  const dockerApps = settings.apps.filter(a => a.runMode === 'docker')

  let yaml = `version: '3.8'\n\nnetworks:\n  lazystack_net:\n    driver: bridge\n\nvolumes:\n`

  activeDbs.forEach(db => {
    if (db.type !== 'sqlite') {
      yaml += `  ${db.type}_data:\n`
    }
  })

  yaml += `\nservices:\n`

  // Database Services
  activeDbs.forEach(db => {
    if (db.type === 'sqlite') return

    yaml += `  ${db.type}:\n`
    switch (db.type) {
      case 'postgres':
        yaml += `    image: postgres:16-alpine\n`
        yaml += `    environment:\n`
        yaml += `      POSTGRES_USER: \${POSTGRES_USER:-lazystack_user}\n`
        yaml += `      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-secret}\n`
        yaml += `      POSTGRES_DB: \${POSTGRES_DB:-lazystack_postgres}\n`
        yaml += `    ports:\n      - "\${POSTGRES_PORT:-${db.port}}:5432"\n`
        yaml += `    volumes:\n      - postgres_data:/var/lib/postgresql/data\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'mysql':
        yaml += `    image: mysql:8.4\n`
        yaml += `    environment:\n`
        yaml += `      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-root_secret}\n`
        yaml += `      MYSQL_USER: \${MYSQL_USER:-lazystack_user}\n`
        yaml += `      MYSQL_PASSWORD: \${MYSQL_PASSWORD:-secret}\n`
        yaml += `      MYSQL_DATABASE: \${MYSQL_DB:-lazystack_mysql}\n`
        yaml += `    ports:\n      - "\${MYSQL_PORT:-${db.port}}:3306"\n`
        yaml += `    volumes:\n      - mysql_data:/var/lib/mysql\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'mariadb':
        yaml += `    image: mariadb:11\n`
        yaml += `    environment:\n`
        yaml += `      MARIADB_ROOT_PASSWORD: \${MARIADB_ROOT_PASSWORD:-root_secret}\n`
        yaml += `      MARIADB_USER: \${MARIADB_USER:-lazystack_user}\n`
        yaml += `      MARIADB_PASSWORD: \${MARIADB_PASSWORD:-secret}\n`
        yaml += `      MARIADB_DATABASE: \${MARIADB_DB:-lazystack_mariadb}\n`
        yaml += `    ports:\n      - "\${MARIADB_PORT:-${db.port}}:3306"\n`
        yaml += `    volumes:\n      - mariadb_data:/var/lib/mysql\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "mariadb-admin", "ping", "-h", "localhost"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'redis':
        yaml += `    image: redis:7.2-alpine\n`
        yaml += `    ports:\n      - "\${REDIS_PORT:-${db.port}}:6379"\n`
        yaml += `    volumes:\n      - redis_data:/data\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "redis-cli", "ping"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'valkey':
        yaml += `    image: valkey/valkey:8.0-alpine\n`
        yaml += `    ports:\n      - "\${VALKEY_PORT:-${db.port}}:6379"\n`
        yaml += `    volumes:\n      - valkey_data:/data\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "valkey-cli", "ping"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'mongodb':
        yaml += `    image: mongo:7.0\n`
        yaml += `    environment:\n`
        yaml += `      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER:-lazystack_user}\n`
        yaml += `      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD:-secret}\n`
        yaml += `    ports:\n      - "\${MONGO_PORT:-${db.port}}:27017"\n`
        yaml += `    volumes:\n      - mongodb_data:/data/db\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "mongosh", "--eval", "db.runCommand({ping:1})"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      default:
        yaml += `    image: ${db.type}:latest\n`
        yaml += `    ports:\n      - "${db.port}:${db.port}"\n`
    }
    yaml += `    networks:\n      - lazystack_net\n    restart: unless-stopped\n\n`
  })

  // Database Web Admin GUIs
  const hasSqlDb = activeDbs.some(d => ['postgres', 'mysql', 'mariadb', 'sqlite'].includes(d.type))
  const hasRedisDb = activeDbs.some(d => ['redis', 'valkey'].includes(d.type))

  if (hasSqlDb) {
    yaml += `  db_admin:\n`
    yaml += `    image: adminer:latest\n`
    yaml += `    ports:\n      - "8088:8080"\n`
    yaml += `    networks:\n      - lazystack_net\n    restart: unless-stopped\n\n`
  }

  if (hasRedisDb) {
    yaml += `  redis_admin:\n`
    yaml += `    image: rediscommander/redis-commander:latest\n`
    yaml += `    environment:\n      - REDIS_HOSTS=local:redis:6379\n`
    yaml += `    ports:\n      - "8089:8081"\n`
    yaml += `    networks:\n      - lazystack_net\n    restart: unless-stopped\n\n`
  }

  // Docker Apps
  dockerApps.forEach(app => {
    yaml += `  ${app.folderName}:\n`
    yaml += `    build:\n      context: ../apps/${app.folderName}\n      dockerfile: Dockerfile\n`
    yaml += `    restart: unless-stopped\n`
    if (app.port > 0) {
      yaml += `    ports:\n      - "${app.port}:${app.port}"\n`
    }
    yaml += `    env_file:\n      - ../.env\n      - ../apps/${app.folderName}/.env\n`
    if (activeDbs.filter(d => d.type !== 'sqlite').length > 0) {
      yaml += `    depends_on:\n`
      activeDbs.filter(d => d.type !== 'sqlite').forEach(d => {
        yaml += `      ${d.type}:\n        condition: service_healthy\n`
      })
    }
    yaml += `    networks:\n      - lazystack_net\n\n`
  })

  // Gateway Service
  if (settings.proxy.type !== 'none') {
    yaml += `  gateway:\n`
    yaml += `    image: ${settings.proxy.type === 'nginx' ? 'nginx:alpine' : 'httpd:alpine'}\n`
    yaml += `    ports:\n      - "${settings.proxy.httpPort}:${settings.proxy.httpPort}"\n`
    yaml += `    volumes:\n      - ./${settings.proxy.type}:/etc/${settings.proxy.type}/conf.d:ro\n`
    yaml += `    extra_hosts:\n      - "host.docker.internal:host-gateway"\n`
    yaml += `    networks:\n      - lazystack_net\n    restart: unless-stopped\n`
  }

  return yaml
}

export function generateDockerDevCompose(settings: ProjectSettings): string {
  let yaml = `version: '3.8'\n\nservices:\n`
  settings.apps.filter(a => a.runMode === 'docker').forEach(app => {
    yaml += `  ${app.folderName}:\n`
    yaml += `    volumes:\n      - ../apps/${app.folderName}:/app\n`
    if (['react-vite', 'vue-vite', 'ts-express', 'ts-fastify', 'ts-nestjs'].includes(app.techId)) {
      yaml += `      - /app/node_modules\n`
    }
    yaml += `    environment:\n      - NODE_ENV=development\n      - CHOKIDAR_USEPOLLING=true\n\n`
  })
  return yaml
}

export function getDockerfileForTech(techId: string, port: number): { dockerfile: string, dockerignore: string } {
  let dockerignore = `node_modules\n.git\n.env\n*.log\ndist\nbuild\ntmp\n`

  if (techId === 'assembly-nasm') {
    return {
      dockerfile: `# Ultra-minimal Assembly x86_64 container build
FROM alpine:3.20 AS builder
RUN apk add --no-cache nasm binutils make gcc
WORKDIR /src
COPY . .
RUN make release

# Scratch / Minimal deployment container (<5MB)
FROM scratch
WORKDIR /
COPY --from=builder /src/server /server
EXPOSE ${port}
ENTRYPOINT ["/server"]
`,
      dockerignore: `.git\nserver.o\nserver\n`
    }
  }

  if (techId === 'cpp-drogon') {
    return {
      dockerfile: `# Drogon C++ Asynchronous High-Performance Web Service
FROM drogonframework/drogon:latest AS builder
WORKDIR /src
COPY . .
RUN mkdir -p build && cd build && cmake .. -DCMAKE_BUILD_TYPE=Release && make -j$(nproc)

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libjsoncpp25 libuuid1 zlib1g libc-ares2 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /src/build/drogon_service /app/drogon_service
EXPOSE ${port}
CMD ["./drogon_service"]
`,
      dockerignore: `build\n.git\n`
    }
  }

  if (techId.startsWith('python-')) {
    return {
      dockerfile: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${port}
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${port}"]
`,
      dockerignore: `__pycache__\n*.pyc\n.venv\n.git\n`
    }
  }

  if (techId.startsWith('go-')) {
    return {
      dockerfile: `FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE ${port}
CMD ["./server"]
`,
      dockerignore: `.git\nserver\n`
    }
  }

  if (techId === 'java-springboot') {
    return {
      dockerfile: `FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B || true
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${port}
ENV PORT=${port}
CMD ["java", "-jar", "app.jar"]
`,
      dockerignore: `target\n.git\n`
    }
  }

  if (techId === 'elixir-phoenix') {
    return {
      dockerfile: `FROM elixir:1.16-alpine AS builder
WORKDIR /app
RUN mix local.hex --force && mix local.rebar --force
COPY mix.exs mix.lock* ./
RUN mix deps.get --only prod || true
COPY . .
RUN MIX_ENV=prod mix compile
RUN MIX_ENV=prod mix release

FROM alpine:3.20
RUN apk add --no-cache ncurses-libs libstdc++ openssl
WORKDIR /app
COPY --from=builder /app/_build/prod/rel ./
EXPOSE ${port}
ENV PORT=${port}
CMD ["./server/bin/server", "start"]
`,
      dockerignore: `_build\ndeps\n.git\n`
    }
  }

  if (techId.startsWith('rust-')) {
    return {
      dockerfile: `FROM rust:1.80-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/target/release/app .
EXPOSE ${port}
CMD ["./app"]
`,
      dockerignore: `target\n.git\n`
    }
  }

  if (techId === 'haskell-scotty') {
    return {
      dockerfile: `FROM haskell:9.6 AS builder
WORKDIR /app
COPY . .
RUN cabal update && cabal build --enable-executable-stripping
RUN cp $(cabal list-bin server) /app/server-bin

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgmp10 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/server-bin ./server
EXPOSE ${port}
CMD ["./server"]
`,
      dockerignore: `dist-newstyle\n.git\n`
    }
  }

  if (techId.startsWith('deno-')) {
    return {
      dockerfile: `FROM denoland/deno:alpine-2.0.0
WORKDIR /app
COPY . .
RUN deno cache main.ts || deno cache server.ts || true
EXPOSE ${port}
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId === 'vanilla-html-css-js') {
    return {
      dockerfile: `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE ${port}
CMD ["nginx", "-g", "daemon off;"]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId === 'vanilla-node') {
    return {
      dockerfile: `FROM node:22-alpine
WORKDIR /app
COPY . .
EXPOSE ${port}
CMD ["node", "index.js"]
`,
      dockerignore: `.git\nnode_modules\n`
    }
  }

  if (techId === 'vanilla-php') {
    return {
      dockerfile: `FROM php:8.3-cli-alpine
WORKDIR /app
COPY . .
EXPOSE ${port}
CMD ["php", "-S", "0.0.0.0:${port}", "-t", "."]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId.startsWith('csharp-')) {
    return {
      dockerfile: `FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet build -c Release

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /src .
ENV ASPNETCORE_URLS=http://0.0.0.0:${port}
EXPOSE ${port}
CMD ["dotnet", "run"]
`,
      dockerignore: `bin\nobj\n.git\n`
    }
  }

  if (techId.startsWith('ruby-')) {
    return {
      dockerfile: `FROM ruby:3.3-slim
WORKDIR /app
COPY Gemfile* ./
RUN bundle install || true
COPY . .
EXPOSE ${port}
CMD ["bundle", "exec", "rackup", "-p", "${port}", "-o", "0.0.0.0"]
`,
      dockerignore: `.git\nvendor/bundle\n`
    }
  }

  if (techId === 'kotlin-ktor') {
    return {
      dockerfile: `FROM gradle:8-jdk21-alpine AS build
WORKDIR /app
COPY . .
RUN gradle build --no-daemon || true

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE ${port}
CMD ["java", "-jar", "app.jar"]
`,
      dockerignore: `.gradle\nbuild\n.git\n`
    }
  }

  if (techId === 'c-microhttpd') {
    return {
      dockerfile: `FROM alpine:3.20 AS builder
RUN apk add --no-cache gcc musl-dev libmicrohttpd-dev make
WORKDIR /app
COPY . .
RUN gcc -O2 main.c -lmicrohttpd -o server

FROM alpine:3.20
RUN apk add --no-cache libmicrohttpd
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE ${port}
CMD ["./server"]
`,
      dockerignore: `.git\nserver\n`
    }
  }

  if (techId === 'zig-http') {
    return {
      dockerfile: `FROM alpine:3.20 AS builder
RUN apk add --no-cache zig
WORKDIR /app
COPY . .
RUN zig build-exe main.zig -O ReleaseSafe || true

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE ${port}
CMD ["./main"]
`,
      dockerignore: `zig-cache\nzig-out\n.git\n`
    }
  }

  if (techId === 'dart-flutter') {
    return {
      dockerfile: `FROM dart:stable
WORKDIR /app
COPY pubspec.* ./
RUN dart pub get || true
COPY . .
EXPOSE ${port}
CMD ["dart", "run"]
`,
      dockerignore: `.dart_tool\n.git\n`
    }
  }

  if (techId === 'bash-worker') {
    return {
      dockerfile: `FROM alpine:3.20
RUN apk add --no-cache bash curl jq
WORKDIR /app
COPY . .
RUN chmod +x *.sh
CMD ["./worker.sh"]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId === 'sql-migrations') {
    return {
      dockerfile: `FROM alpine:3.20
RUN apk add --no-cache postgresql-client mysql-client
WORKDIR /migrations
COPY . .
CMD ["sh", "-c", "echo 'SQL Migrations container ready'"]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId === 'fullstack-laravel') {
    return {
      dockerfile: `FROM php:8.3-cli-alpine
WORKDIR /app
COPY . .
EXPOSE ${port}
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=${port}"]
`,
      dockerignore: `vendor\n.git\n`
    }
  }

  return {
    dockerfile: `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build || true

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev || npm install
COPY --from=builder /app ./
EXPOSE ${port}
ENV PORT=${port}
CMD ["npm", "start"]
`,
    dockerignore
  }
}
