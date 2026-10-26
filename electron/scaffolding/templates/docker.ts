import { ProjectSettings, CartApp, SelectedDatabase } from '../../../src/types'
import { DATABASE_CATALOG } from '../../../src/data/databases'
import { resolveStructurePaths } from '../../../src/data/structurePresets'
import { getDatabaseAdminUiOption } from '../../../src/data/databaseAdminUis'

export function getDbServiceName(db: SelectedDatabase, idx: number, apps?: CartApp[]): string {
  if (db.customName) {
    const slug = db.customName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '')
    if (slug) return slug
  }
  const assignedApp = apps?.find(a => a.id === db.assignedAppId)
  if (assignedApp) {
    return `${assignedApp.folderName}_${db.type}`
  }
  return idx > 0 ? `${db.type}_${idx + 1}` : db.type
}

const yamlQuote = (value: string) => JSON.stringify(value)

export function generateDockerCompose(settings: ProjectSettings): string {
  const paths = resolveStructurePaths(settings)

  // Filter out cloud-only databases — they don't need Docker containers
  const activeDbs = settings.databases.filter(d => {
    if (!d.enabled) return false
    const def = DATABASE_CATALOG.find(c => c.id === d.type)
    // Cloud services without imageTag don't get Docker containers
    return !def?.isCloud || def?.imageTag
  })
  const hostOnlyTechIds = new Set(['python-anvil', 'swiftui-client'])
  const dockerApps = settings.apps.filter(a => a.runMode === 'docker' && !hostOnlyTechIds.has(a.techId))

  let yaml = `version: '3.8'\n\nnetworks:\n  lazystack_net:\n    driver: bridge\n\nvolumes:\n`

  activeDbs.forEach((db, idx) => {
    if (db.type !== 'sqlite') {
      const sName = getDbServiceName(db, idx, settings.apps)
      yaml += `  ${sName}_data:\n`
    }
  })

  yaml += `\nservices:\n`

  // Database Services
  activeDbs.forEach((db, idx) => {
    if (db.type === 'sqlite') return
    const sName = getDbServiceName(db, idx, settings.apps)

    yaml += `  ${sName}:\n`
    switch (db.type) {
      case 'postgres':
        yaml += `    image: postgres:16-alpine\n`
        yaml += `    environment:\n`
        yaml += `      POSTGRES_USER: \${${sName.toUpperCase()}_USER:-${db.username || 'lazystack_user'}}\n`
        yaml += `      POSTGRES_PASSWORD: \${${sName.toUpperCase()}_PASSWORD:-secret}\n`
        yaml += `      POSTGRES_DB: \${${sName.toUpperCase()}_DB:-${db.databaseName || 'lazystack_postgres'}}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:5432"\n`
        yaml += `    volumes:\n      - ${sName}_data:/var/lib/postgresql/data\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'mysql':
        yaml += `    image: mysql:8.4\n`
        yaml += `    environment:\n`
        yaml += `      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-root_secret}\n`
        yaml += `      MYSQL_USER: \${${sName.toUpperCase()}_USER:-${db.username || 'lazystack_user'}}\n`
        yaml += `      MYSQL_PASSWORD: \${${sName.toUpperCase()}_PASSWORD:-secret}\n`
        yaml += `      MYSQL_DATABASE: \${${sName.toUpperCase()}_DB:-${db.databaseName || 'lazystack_mysql'}}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:3306"\n`
        yaml += `    volumes:\n      - ${sName}_data:/var/lib/mysql\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'mariadb':
        yaml += `    image: mariadb:11\n`
        yaml += `    environment:\n`
        yaml += `      MARIADB_ROOT_PASSWORD: \${MARIADB_ROOT_PASSWORD:-root_secret}\n`
        yaml += `      MARIADB_USER: \${${sName.toUpperCase()}_USER:-${db.username || 'lazystack_user'}}\n`
        yaml += `      MARIADB_PASSWORD: \${${sName.toUpperCase()}_PASSWORD:-secret}\n`
        yaml += `      MARIADB_DATABASE: \${${sName.toUpperCase()}_DB:-${db.databaseName || 'lazystack_mariadb'}}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:3306"\n`
        yaml += `    volumes:\n      - ${sName}_data:/var/lib/mysql\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "mariadb-admin", "ping", "-h", "localhost"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'redis':
        yaml += `    image: redis:7.2-alpine\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:6379"\n`
        yaml += `    volumes:\n      - ${sName}_data:/data\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "redis-cli", "ping"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'valkey':
        yaml += `    image: valkey/valkey:8.0-alpine\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:6379"\n`
        yaml += `    volumes:\n      - ${sName}_data:/data\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "valkey-cli", "ping"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'mongodb':
        yaml += `    image: mongo:7.0\n`
        yaml += `    environment:\n`
        yaml += `      MONGO_INITDB_ROOT_USERNAME: \${${sName.toUpperCase()}_USER:-${db.username || 'lazystack_user'}}\n`
        yaml += `      MONGO_INITDB_ROOT_PASSWORD: \${${sName.toUpperCase()}_PASSWORD:-secret}\n`
        yaml += `      MONGO_INITDB_DATABASE: \${${sName.toUpperCase()}_DB:-${db.databaseName || 'lazystack_mongodb'}}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:27017"\n`
        yaml += `    volumes:\n      - ${sName}_data:/data/db\n`
        yaml += `    healthcheck:\n`
        yaml += `      test: ["CMD", "mongosh", "--eval", "db.runCommand({ping:1})"]\n`
        yaml += `      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'clickhouse':
        yaml += `    image: clickhouse/clickhouse-server:24.3-alpine\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:8123"\n      - "9000:9000"\n`
        yaml += `    volumes:\n      - ${sName}_data:/var/lib/clickhouse\n`
        yaml += `    healthcheck:\n      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8123/ping || exit 1"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'surrealdb':
        yaml += `    image: surrealdb/surrealdb:v2.0\n`
        yaml += `    command: start --log trace --user root --pass root file:/data/database.db\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:8000"\n`
        yaml += `    volumes:\n      - ${sName}_data:/data\n`
        yaml += `    healthcheck:\n      test: ["CMD", "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:8000/health"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'neo4j':
        yaml += `    image: neo4j:5.19\n`
        yaml += `    environment:\n      NEO4J_AUTH: \${NEO4J_AUTH:-neo4j/secret_password}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:7474"\n      - "7687:7687"\n`
        yaml += `    volumes:\n      - ${sName}_data:/data\n`
        yaml += `    healthcheck:\n      test: ["CMD", "cypher-shell", "RETURN 1"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'qdrant':
        yaml += `    image: qdrant/qdrant:v1.9.0\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:6333"\n      - "6334:6334"\n`
        yaml += `    volumes:\n      - ${sName}_data:/qdrant/storage\n`
        yaml += `    healthcheck:\n      test: ["CMD-SHELL", "bash -c '</dev/tcp/localhost/6333'"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'meilisearch':
        yaml += `    image: getmeili/meilisearch:v1.8\n`
        yaml += `    environment:\n      MEILI_MASTER_KEY: \${MEILI_MASTER_KEY:-masterKeySecret123}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:7700"\n`
        yaml += `    volumes:\n      - ${sName}_data:/meili_data\n`
        yaml += `    healthcheck:\n      test: ["CMD", "curl", "-f", "http://localhost:7700/health"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'minio':
        yaml += `    image: minio/minio:latest\n`
        yaml += `    command: server /data --console-address ":9001"\n`
        yaml += `    environment:\n      MINIO_ROOT_USER: \${MINIO_ROOT_USER:-lazystack_admin}\n      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:-minio_secret_password}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:9000"\n      - "9001:9001"\n`
        yaml += `    volumes:\n      - ${sName}_data:/data\n`
        yaml += `    healthcheck:\n      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'scylladb':
        yaml += `    image: scylladb/scylla:5.4\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:9042"\n`
        yaml += `    volumes:\n      - ${sName}_data:/var/lib/scylla\n`
        yaml += `    healthcheck:\n      test: ["CMD-SHELL", "nodetool status | grep -q 'UN'"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'rabbitmq':
        yaml += `    image: rabbitmq:3-management-alpine\n`
        yaml += `    environment:\n      RABBITMQ_DEFAULT_USER: \${${sName.toUpperCase()}_USER:-lazystack}\n      RABBITMQ_DEFAULT_PASS: \${${sName.toUpperCase()}_PASSWORD:-secret}\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:5672"\n      - "15672:15672"\n`
        yaml += `    volumes:\n      - ${sName}_data:/var/lib/rabbitmq\n`
        yaml += `    healthcheck:\n      test: ["CMD", "rabbitmq-diagnostics", "check_running"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      case 'pocketbase':
        yaml += `    image: ghcr.io/muchobien/pocketbase:latest\n`
        yaml += `    ports:\n      - "\${${sName.toUpperCase()}_PORT:-${db.port}}:8090"\n`
        yaml += `    volumes:\n      - ${sName}_data:/pb_data\n`
        yaml += `    healthcheck:\n      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n`
        break
      default:
        yaml += `    image: ${db.type}:latest\n`
        yaml += `    ports:\n      - "${db.port}:${db.port}"\n`
    }
    yaml += `    networks:\n      - lazystack_net\n    restart: unless-stopped\n\n`
  })

  // Optional per-instance database web administration UIs
  activeDbs.forEach(db => {
    const option = getDatabaseAdminUiOption(db.type, db.adminUi)
    // Prisma Studio runs on the host so it can bind a reachable local port.
    // The current Studio CLI binds to loopback inside containers.
    if (!option || option.hostProcess) return
    const sName = getDbServiceName(db, settings.databases.indexOf(db), settings.apps)
    const uiServiceName = `${sName}_admin_ui`
    const uiPort = db.adminUiPort || option.defaultPort
    const composeVariable = (key: string, fallback: string) => '${' + key + ':-' + fallback + '}'
    const credentials = composeVariable(`${sName.toUpperCase()}_USER`, db.username || 'lazystack_user')
    const password = composeVariable(`${sName.toUpperCase()}_PASSWORD`, 'secret')
    const database = composeVariable(`${sName.toUpperCase()}_DB`, db.databaseName || 'lazystack_mongodb')

    yaml += `  ${uiServiceName}:\n`
    switch (option.id) {
      case 'adminer':
        yaml += `    image: adminer:latest\n`
        yaml += `    environment:\n      ADMINER_DEFAULT_SERVER: ${sName}\n`
        break
      case 'pgadmin':
        yaml += `    image: dpage/pgadmin4:latest\n`
        yaml += `    environment:\n      PGADMIN_DEFAULT_EMAIL: ${credentials}@lazystack.local\n      PGADMIN_DEFAULT_PASSWORD: ${password}\n      PGADMIN_CONFIG_SERVER_MODE: "False"\n`
        break
      case 'phpmyadmin':
        yaml += `    image: phpmyadmin:latest\n`
        yaml += `    environment:\n      PMA_HOST: ${sName}\n      PMA_PORT: "3306"\n      PMA_USER: ${credentials}\n      PMA_PASSWORD: ${password}\n      UPLOAD_LIMIT: 64M\n`
        break
      case 'mongo-express':
        yaml += `    image: mongo-express:1.0.2-20-alpine3.19\n`
        yaml += `    environment:\n      ME_CONFIG_MONGODB_URL: "mongodb://${credentials}:${password}@${sName}:27017/${database}?authSource=admin"\n      ME_CONFIG_BASICAUTH_ENABLED: "false"\n`
        break
      case 'redis-commander':
        yaml += `    image: rediscommander/redis-commander:latest\n`
        yaml += `    environment:\n      REDIS_HOSTS: local:${sName}:6379\n`
        break
      case 'prisma-studio':
        break
    }
    yaml += `    ports:\n      - "127.0.0.1:${uiPort}:${option.containerPort}"\n`
    yaml += `    depends_on:\n      ${sName}:\n        condition: service_healthy\n`
    yaml += `    networks:\n      - lazystack_net\n    restart: unless-stopped\n\n`
  })

  // Docker Apps
  dockerApps.forEach(app => {
    const appRelPath = paths.getAppRelativePath(app.folderName, app.id, app.role)
    yaml += `  ${app.folderName}:\n`
    yaml += `    build:\n      context: ../${appRelPath}\n      dockerfile: Dockerfile\n`
    yaml += `    restart: unless-stopped\n`
    if (app.port > 0) {
      yaml += `    ports:\n      - "${app.port}:${app.port}"\n`
    }
    yaml += `    env_file:\n      - ../${appRelPath}/.env\n`
    if ((app.connections || []).some(connection => settings.apps.find(target => target.id === connection.targetAppId)?.runMode === 'host')) {
      yaml += `    extra_hosts:\n      - "host.docker.internal:host-gateway"\n`
    }

    const relevantDbs = activeDbs.filter(d => {
      if (d.type === 'sqlite') return false
      if (paths.databaseIsolation === 'service-isolated') {
        return d.assignedAppId === app.id || d.assignedAppId === 'global' || !d.assignedAppId
      }
      return true
    })

    const dependencies = new Map<string, 'service_healthy' | 'service_started'>()
    relevantDbs.forEach(db => {
      const index = settings.databases.indexOf(db)
      dependencies.set(getDbServiceName(db, index, settings.apps), 'service_healthy')
    })
    for (const connection of app.connections || []) {
      const target = settings.apps.find(item => item.id === connection.targetAppId)
      if (!target || target.runMode !== 'docker') continue
      dependencies.set(target.folderName, target.healthCheck?.enabled ? 'service_healthy' : 'service_started')
    }
    if (dependencies.size > 0) {
      yaml += `    depends_on:\n`
      dependencies.forEach((condition, serviceName) => {
        yaml += `      ${serviceName}:\n        condition: ${condition}\n`
      })
    }
    if (app.healthCheck?.enabled) {
      const check = app.healthCheck
      const command = check.type === 'http'
        ? `wget --no-verbose --tries=1 --spider http://127.0.0.1:${app.port}${check.path || '/health'}`
        : (check.command || '').replaceAll('${PORT}', String(app.port))
      yaml += `    healthcheck:\n      test: ["CMD-SHELL", ${yamlQuote(command)}]\n      interval: ${check.intervalSeconds}s\n      timeout: ${check.timeoutSeconds}s\n      retries: ${check.retries}\n      start_period: ${check.startPeriodSeconds}s\n`
    }
    yaml += `    networks:\n      - lazystack_net\n\n`
  })

  const swaggerApps = settings.apps.filter(app => (app.testingTools || []).includes('swagger-openapi'))
  const usedPorts = new Set([
    ...settings.apps.map(app => app.port),
    ...settings.databases.filter(db => db.enabled).map(db => db.port),
    settings.proxy.httpPort
  ])
  swaggerApps.forEach((app, index) => {
    let uiPort = 8088 + index
    while (usedPorts.has(uiPort)) uiPort++
    usedPorts.add(uiPort)
    const appRelPath = paths.getAppRelativePath(app.folderName, app.id, app.role)
    yaml += `  ${app.folderName}_swagger_ui:\n`
    yaml += `    image: swaggerapi/swagger-ui:latest\n`
    yaml += `    environment:\n      SWAGGER_JSON: /openapi.yaml\n`
    yaml += `    ports:\n      - "127.0.0.1:${uiPort}:8080"\n`
    yaml += `    volumes:\n      - ../${appRelPath}/openapi.yaml:/openapi.yaml:ro\n`
    yaml += `    networks:\n      - lazystack_net\n    restart: unless-stopped\n\n`
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
  const paths = resolveStructurePaths(settings)
  let yaml = `version: '3.8'\n\nservices:\n`
  settings.apps.filter(a => a.runMode === 'docker' && !['python-anvil', 'swiftui-client'].includes(a.techId)).forEach(app => {
    const appRelPath = paths.getAppRelativePath(app.folderName, app.id, app.role)
    yaml += `  ${app.folderName}:\n`
    yaml += `    volumes:\n      - ../${appRelPath}:/app\n`
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

  if (techId === 'swift-vapor') {
    return {
      dockerfile: `FROM swift:5.10-jammy AS builder
WORKDIR /app
COPY Package.* ./
COPY Sources ./Sources
RUN swift build -c release

FROM swift:5.10-jammy-slim
WORKDIR /app
COPY --from=builder /app/.build/release/App /app/App
EXPOSE ${port}
ENV PORT=${port}
CMD ["./App", "serve", "--hostname", "0.0.0.0", "--port", "${port}"]
`,
      dockerignore: `.build\n.git\n`
    }
  }

  if (techId === 'scala-play') {
    return {
      dockerfile: `FROM sbtscala/scala-sbt:eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY build.sbt .
COPY project ./project
COPY app ./app
COPY conf ./conf
RUN sbt stage

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/universal/stage ./
EXPOSE ${port}
CMD ["./bin/server", "-Dhttp.port=${port}"]
`,
      dockerignore: `target\n.git\n`
    }
  }

  if (techId === 'clojure-ring') {
    return {
      dockerfile: `FROM clojure:temurin-17-tools-deps-alpine AS builder
WORKDIR /app
COPY deps.edn .
COPY src ./src
RUN clj -T:build uber

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/app-standalone.jar app.jar
EXPOSE ${port}
ENV PORT=${port}
CMD ["java", "-jar", "app.jar"]
`,
      dockerignore: `target\n.git\n`
    }
  }

  if (techId === 'ocaml-dream') {
    return {
      dockerfile: `FROM ocaml/opam:debian-ocaml-5.1 AS builder
WORKDIR /home/opam/src
COPY dune-project dune *.opam ./
RUN opam install . --deps-only
COPY . .
RUN eval $(opam env) && dune build

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /home/opam/src/_build/default/bin/server.exe /app/server
EXPOSE ${port}
CMD ["./server"]
`,
      dockerignore: `_build\n.git\n`
    }
  }

  if (techId === 'julia-genie') {
    return {
      dockerfile: `FROM julia:1.10-alpine
WORKDIR /app
COPY Project.toml .
RUN julia -e 'using Pkg; Pkg.instantiate()'
COPY . .
EXPOSE ${port}
ENV PORT=${port}
CMD ["julia", "--project", "-e", "using Genie; Genie.up(${port}, \"0.0.0.0\", async=false)"]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId === 'lua-lapis') {
    return {
      dockerfile: `FROM openresty/openresty:alpine
WORKDIR /app
RUN apk add --no-cache luarocks && luarocks install lapis
COPY . .
EXPOSE ${port}
CMD ["lapis", "server", "production"]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId === 'r-plumber') {
    return {
      dockerfile: `FROM r-base:4.4-alpine
WORKDIR /app
RUN R -e "install.packages('plumber', repos='https://cloud.r-project.org')"
COPY . .
EXPOSE ${port}
CMD ["R", "-e", "pr <- plumber::plumb('plumber.R'); pr$run(host='0.0.0.0', port=${port})"]
`,
      dockerignore: `.git\n`
    }
  }

  if (techId === 'erlang-cowboy') {
    return {
      dockerfile: `FROM erlang:26-alpine AS builder
WORKDIR /app
COPY rebar.config .
COPY src ./src
RUN rebar3 release

FROM alpine:3.20
RUN apk add --no-cache openssl ncurses-libs
WORKDIR /app
COPY --from=builder /app/_build/default/rel ./rel
EXPOSE ${port}
CMD ["./rel/server/bin/server", "foreground"]
`,
      dockerignore: `_build\n.git\n`
    }
  }

  if (techId === 'nim-happyx') {
    return {
      dockerfile: `FROM nimlang/nim:alpine AS builder
WORKDIR /app
RUN nimble install -y happyx
COPY . .
RUN nim c -d:release -d:danger -o:server main.nim

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE ${port}
CMD ["./server"]
`,
      dockerignore: `nimcache\n.git\n`
    }
  }

  if (techId === 'crystal-kemal') {
    return {
      dockerfile: `FROM crystallang/crystal:1.12-alpine AS builder
WORKDIR /app
COPY shard.yml shard.lock* ./
RUN shards install --production
COPY . .
RUN crystal build --release --static src/server.cr -o bin/server

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/bin/server .
EXPOSE ${port}
CMD ["./server", "-p", "${port}"]
`,
      dockerignore: `lib\n.git\n`
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

  if (techId === 'vanilla-go') {
    return { dockerfile: `FROM golang:1.23-alpine AS build\nWORKDIR /src\nCOPY . .\nRUN CGO_ENABLED=0 go build -o /server .\nFROM scratch\nCOPY --from=build /server /server\nEXPOSE ${port}\nENV PORT=${port}\nENTRYPOINT ["/server"]\n`, dockerignore: `.git\n` }
  }

  if (techId === 'vanilla-python') {
    return { dockerfile: `FROM python:3.12-alpine\nWORKDIR /app\nCOPY . .\nEXPOSE ${port}\nENV PORT=${port}\nCMD ["python", "main.py"]\n`, dockerignore: `.git\n__pycache__\n` }
  }

  if (techId === 'vanilla-java') {
    return { dockerfile: `FROM eclipse-temurin:21-jdk-alpine AS build\nWORKDIR /app\nCOPY Main.java .\nRUN javac Main.java\nFROM eclipse-temurin:21-jre-alpine\nWORKDIR /app\nCOPY --from=build /app/Main.class .\nEXPOSE ${port}\nENV PORT=${port}\nCMD ["java", "Main"]\n`, dockerignore: `.git\n` }
  }

  if (techId === 'python-reflex') {
    return { dockerfile: `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE ${port}\nENV PORT=${port}\nCMD ["sh", "-c", "reflex run --env prod --frontend-port ${port} --backend-port 8000"]\n`, dockerignore: `.git\n.venv\n__pycache__\n` }
  }

  if (techId === 'python-nicegui') {
    return { dockerfile: `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE ${port}\nCMD ["python", "main.py"]\n`, dockerignore: `.git\n.venv\n__pycache__\n` }
  }

  if (techId === 'kotlin-js') {
    return { dockerfile: `FROM gradle:8-jdk21-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN gradle jsBrowserDistribution --no-daemon\nFROM nginx:alpine\nCOPY --from=build /app/build/dist/js/productionExecutable/ /usr/share/nginx/html/\nEXPOSE ${port}\n`, dockerignore: `.gradle\nbuild\n.git\n` }
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
