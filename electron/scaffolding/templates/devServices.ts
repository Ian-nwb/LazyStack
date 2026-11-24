/**
 * Developer services added in 2.0: auth (Keycloak), email (Mailpit), AWS emulation (LocalStack,
 * DynamoDB Local), observability (Grafana LGTM), local AI (Ollama), search (Typesense,
 * Elasticsearch), S3 (SeaweedFS) and workflows (Temporal).
 *
 * Each one has a Compose service (with a healthcheck that only uses tools present in its image)
 * and the environment variables a connected app receives.
 */
import type { DatabaseType, ProjectSettings, SelectedDatabase } from '../../../src/types'

export const DEV_SERVICE_TYPES = [
  'keycloak', 'mailpit', 'localstack', 'otel-lgtm', 'ollama', 'typesense', 'elasticsearch', 'dynamodb-local', 'seaweedfs', 'temporal'
] as const satisfies readonly DatabaseType[]
export type DevServiceType = (typeof DEV_SERVICE_TYPES)[number]

export const isDevService = (type: DatabaseType): type is DevServiceType => (DEV_SERVICE_TYPES as readonly string[]).includes(type)

/** Keycloak realm name for a project: lowercase, URL-safe. */
export const keycloakRealm = (projectName: string) => projectName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'lazystack'

/** A bash-only HTTP probe for images without curl or wget. */
const bashHttpProbe = (port: number, path: string) =>
  `["CMD", "bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/${port} && printf 'GET ${path} HTTP/1.0\\\\r\\\\nHost: localhost\\\\r\\\\n\\\\r\\\\n' >&3 && read -r status <&3 && [[ $$status == *' 200 '* ]]"]`

const healthcheck = (test: string, retries = 20, startPeriod = '10s') =>
  `    healthcheck:\n      test: ${test}\n      interval: 5s\n      timeout: 5s\n      retries: ${retries}\n      start_period: ${startPeriod}\n`

/** Compose lines (image through healthcheck) for one dev service; the caller adds networks and restart. */
export function devServiceCompose(type: DevServiceType, db: SelectedDatabase, sName: string, settings: ProjectSettings): string {
  const portVar = (fallback: number) => `\${${sName.toUpperCase()}_PORT:-${db.port || fallback}}`
  switch (type) {
    case 'keycloak': {
      // KC_HOSTNAME pins the token issuer to the browser-facing URL; backchannel requests from
      // containers (keycloak:8080) still work because the backchannel is dynamic.
      const hostPort = db.port || 8085
      return `    image: quay.io/keycloak/keycloak:26.4\n` +
        `    command: ["start-dev", "--import-realm"]\n` +
        `    environment:\n` +
        `      KC_BOOTSTRAP_ADMIN_USERNAME: \${KEYCLOAK_ADMIN:-admin}\n` +
        `      KC_BOOTSTRAP_ADMIN_PASSWORD: \${KEYCLOAK_ADMIN_PASSWORD:-admin}\n` +
        `      KC_HEALTH_ENABLED: "true"\n` +
        `      KC_HOSTNAME: http://localhost:${hostPort}\n` +
        `      KC_HOSTNAME_BACKCHANNEL_DYNAMIC: "true"\n` +
        `    ports:\n      - "${portVar(8085)}:8080"\n` +
        `    volumes:\n      - ./keycloak:/opt/keycloak/data/import:ro\n` +
        healthcheck(bashHttpProbe(9000, '/health/ready'), 30, '20s')
    }
    case 'mailpit':
      return `    image: axllent/mailpit:latest\n` +
        `    environment:\n      MP_SMTP_AUTH_ACCEPT_ANY: "true"\n      MP_SMTP_AUTH_ALLOW_INSECURE: "true"\n` +
        `    ports:\n      - "${portVar(1025)}:1025"\n      - "8025:8025"\n` +
        healthcheck('["CMD", "/mailpit", "readyz"]', 10, '2s')
    case 'localstack':
      return `    image: localstack/localstack:4\n` +
        `    environment:\n      PERSISTENCE: "1"\n` +
        `    ports:\n      - "${portVar(4566)}:4566"\n` +
        `    volumes:\n      - ${sName}_data:/var/lib/localstack\n` +
        healthcheck('["CMD", "curl", "-fs", "http://127.0.0.1:4566/_localstack/health"]', 30, '10s')
    case 'otel-lgtm':
      return `    image: grafana/otel-lgtm:latest\n` +
        `    ports:\n      - "${portVar(4318)}:4318"\n      - "4317:4317"\n      - "3300:3000"\n` +
        `    volumes:\n      - ${sName}_data:/data\n` +
        healthcheck('["CMD", "curl", "-fs", "http://127.0.0.1:3000/api/health"]', 30, '20s')
    case 'ollama':
      return `    image: ollama/ollama:latest\n` +
        `    ports:\n      - "${portVar(11434)}:11434"\n` +
        `    volumes:\n      - ${sName}_data:/root/.ollama\n` +
        healthcheck('["CMD", "ollama", "list"]', 20, '5s')
    case 'typesense':
      return `    image: typesense/typesense:29.0\n` +
        `    command: ["--data-dir", "/data", "--api-key=\${TYPESENSE_API_KEY:-lazystack-dev-key}", "--enable-cors"]\n` +
        `    ports:\n      - "${portVar(8108)}:8108"\n` +
        `    volumes:\n      - ${sName}_data:/data\n` +
        healthcheck(bashHttpProbe(8108, '/health'), 20, '5s')
    case 'elasticsearch':
      return `    image: docker.elastic.co/elasticsearch/elasticsearch:9.2.0\n` +
        `    environment:\n      discovery.type: single-node\n      xpack.security.enabled: "false"\n      ES_JAVA_OPTS: -Xms512m -Xmx512m\n` +
        `    ports:\n      - "${portVar(9201)}:9200"\n` +
        `    volumes:\n      - ${sName}_data:/usr/share/elasticsearch/data\n` +
        healthcheck('["CMD-SHELL", "curl -fs http://127.0.0.1:9200/_cluster/health || exit 1"]', 40, '20s')
    case 'dynamodb-local':
      return `    image: amazon/dynamodb-local:latest\n` +
        `    command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"]\n` +
        `    ports:\n      - "${portVar(8004)}:8000"\n` +
        // DynamoDB Local answers unsigned requests with 400, so any HTTP response means it is up.
        healthcheck('["CMD-SHELL", "curl -s -o /dev/null http://127.0.0.1:8000 || exit 1"]', 20, '5s')
    case 'seaweedfs':
      return `    image: chrislusf/seaweedfs:latest\n` +
        `    command: ["server", "-s3", "-dir=/data", "-ip.bind=0.0.0.0"]\n` +
        `    ports:\n      - "${portVar(8333)}:8333"\n` +
        `    volumes:\n      - ${sName}_data:/data\n` +
        healthcheck('["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:8333/healthz || exit 1"]', 30, '10s')
    case 'temporal':
      return `    image: temporalio/temporal:latest\n` +
        `    command: ["server", "start-dev", "--ip", "0.0.0.0", "--ui-port", "8233"]\n` +
        `    ports:\n      - "${portVar(7233)}:7233"\n      - "8233:8233"\n` +
        healthcheck('["CMD", "temporal", "operator", "cluster", "health", "--address", "127.0.0.1:7233"]', 30, '10s')
  }
  return ''
}

export interface DevServiceEnvContext {
  host: string
  /** Port reachable from the app: the container port for Docker apps, the published one for host apps. */
  port: number
  /** Port published on the host (browser-facing). */
  hostPort: number
  appFolder: string
  projectName: string
}

/** Environment variables (name, value) a connected app gets for a dev service. */
export function devServiceEnv(type: DevServiceType, ctx: DevServiceEnvContext): Array<[string, string]> {
  const base = `http://${ctx.host}:${ctx.port}`
  switch (type) {
    case 'keycloak': {
      const realm = keycloakRealm(ctx.projectName)
      return [
        // Tokens carry the browser-facing issuer; discovery may use the in-network address.
        ['OIDC_ISSUER_URL', `http://localhost:${ctx.hostPort}/realms/${realm}`],
        ['OIDC_DISCOVERY_URL', `${base}/realms/${realm}/.well-known/openid-configuration`],
        ['OIDC_CLIENT_ID', ctx.appFolder]
      ]
    }
    case 'mailpit':
      return [['SMTP_HOST', ctx.host], ['SMTP_PORT', String(ctx.port)], ['SMTP_URL', `smtp://${ctx.host}:${ctx.port}`]]
    case 'localstack':
      return [['AWS_ENDPOINT_URL', base], ['AWS_REGION', 'us-east-1'], ['AWS_ACCESS_KEY_ID', 'test'], ['AWS_SECRET_ACCESS_KEY', 'test']]
    case 'otel-lgtm':
      return [['OTEL_EXPORTER_OTLP_ENDPOINT', base], ['OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'], ['OTEL_SERVICE_NAME', ctx.appFolder]]
    case 'ollama':
      return [['OLLAMA_HOST', base]]
    case 'typesense':
      return [['TYPESENSE_URL', base], ['TYPESENSE_API_KEY', 'lazystack-dev-key']]
    case 'elasticsearch':
      return [['ELASTICSEARCH_URL', base]]
    case 'dynamodb-local':
      return [['DYNAMODB_ENDPOINT', base], ['AWS_REGION', 'us-east-1'], ['AWS_ACCESS_KEY_ID', 'test'], ['AWS_SECRET_ACCESS_KEY', 'test']]
    case 'seaweedfs':
      return [['S3_ENDPOINT', base], ['AWS_REGION', 'us-east-1'], ['AWS_ACCESS_KEY_ID', 'lazystack'], ['AWS_SECRET_ACCESS_KEY', 'lazystack-secret']]
    case 'temporal':
      return [['TEMPORAL_ADDRESS', `${ctx.host}:${ctx.port}`], ['TEMPORAL_NAMESPACE', 'default']]
  }
  return []
}

/** Keycloak realm import: one realm per project, one public OIDC client per app, and a dev user. */
export function keycloakRealmJson(settings: ProjectSettings): string {
  const realm = keycloakRealm(settings.projectName)
  return JSON.stringify({
    realm,
    enabled: true,
    registrationAllowed: true,
    clients: settings.apps.map(app => ({
      clientId: app.folderName,
      name: app.folderName,
      enabled: true,
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      redirectUris: ['*'],
      webOrigins: ['*'],
      attributes: { 'pkce.code.challenge.method': 'S256' }
    })),
    users: [{
      username: 'dev',
      email: 'dev@example.com',
      emailVerified: true,
      firstName: 'Dev',
      lastName: 'User',
      enabled: true,
      credentials: [{ type: 'password', value: 'dev', temporary: false }]
    }]
  }, null, 2) + '\n'
}
