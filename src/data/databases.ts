import { DatabaseOption } from '../types'

export const DATABASE_CATALOG: DatabaseOption[] = [
  {
    id: 'sqlite',
    name: 'SQLite (Embedded / Shared File)',
    defaultPort: 0,
    category: 'embedded',
    description: 'Zero-config embedded relational database with ACID compliance. Ideal for local dev, microservices, and lightweight backends.',
    imageTag: 'keinos/sqlite3:latest',
    healthcheckCmd: 'sqlite3 /infra/sqlite/data.db "SELECT 1;"',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  {
    id: 'postgres',
    name: 'PostgreSQL 16',
    defaultPort: 5432,
    category: 'relational',
    description: 'World’s most advanced open source relational database with JSONB and GIS support.',
    imageTag: 'postgres:16-alpine',
    healthcheckCmd: 'pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'mysql',
    name: 'MySQL 8.4 LTS',
    defaultPort: 3306,
    category: 'relational',
    description: 'Fast and reliable relational database standard for web applications.',
    imageTag: 'mysql:8.4',
    healthcheckCmd: 'mysqladmin ping -h localhost',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'mariadb',
    name: 'MariaDB 11',
    defaultPort: 3307,
    category: 'relational',
    description: 'High-performance drop-in MySQL replacement with advanced storage engines.',
    imageTag: 'mariadb:11',
    healthcheckCmd: 'mariadb-admin ping -h localhost',
    badgeColor: 'bg-amber-600/20 text-amber-400 border-amber-600/40'
  },
  {
    id: 'mongodb',
    name: 'MongoDB 7',
    defaultPort: 27017,
    category: 'document',
    description: 'Document-oriented NoSQL database for flexible and dynamic schema designs.',
    isHeavyMemory: true,
    imageTag: 'mongo:7.0',
    healthcheckCmd: 'mongosh --eval "db.runCommand({ping:1})"',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'redis',
    name: 'Redis 7 (Alpine)',
    defaultPort: 6379,
    category: 'key-value',
    description: 'In-memory data store for ultra-fast caching, pub/sub messaging, and sessions.',
    imageTag: 'redis:7.2-alpine',
    healthcheckCmd: 'redis-cli ping',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  {
    id: 'valkey',
    name: 'Valkey 8 (Linux Foundation)',
    defaultPort: 6380,
    category: 'key-value',
    description: 'High-performance, community-driven open source key-value datastore & drop-in Redis alternative backed by Linux Foundation.',
    imageTag: 'valkey/valkey:8.0-alpine',
    healthcheckCmd: 'valkey-cli ping',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  {
    id: 'clickhouse',
    name: 'ClickHouse OLAP',
    defaultPort: 8123,
    category: 'olap',
    description: 'Column-oriented DBMS for real-time analytical reporting and massive datasets.',
    isHeavyMemory: true,
    imageTag: 'clickhouse/clickhouse-server:24.3-alpine',
    healthcheckCmd: 'wget --no-verbose --tries=1 --spider http://localhost:8123/ping || exit 1',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
  },
  {
    id: 'surrealdb',
    name: 'SurrealDB v2',
    defaultPort: 8000,
    category: 'document',
    description: 'Next-gen multi-model cloud database (relational, document, graph) with GraphQL.',
    imageTag: 'surrealdb/surrealdb:v2.0',
    healthcheckCmd: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  {
    id: 'neo4j',
    name: 'Neo4j Graph Database',
    defaultPort: 7474,
    category: 'graph',
    description: 'Native graph database engine with Cypher query language and graph analytics.',
    isHeavyMemory: true,
    imageTag: 'neo4j:5.19',
    healthcheckCmd: 'cypher-shell "RETURN 1"',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'qdrant',
    name: 'Qdrant Vector DB (AI & Embeddings)',
    defaultPort: 6333,
    category: 'vector',
    description: 'High-performance vector search engine & database for AI embeddings, semantic search, and RAG pipelines.',
    imageTag: 'qdrant/qdrant:v1.9.0',
    healthcheckCmd: 'bash -c "</dev/tcp/localhost/6333"',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
  },
  {
    id: 'meilisearch',
    name: 'Meilisearch (Instant Full-Text)',
    defaultPort: 7700,
    category: 'search',
    description: 'Ultra-fast, typo-tolerant full-text search engine with intuitive REST API and instant faceted filtering.',
    imageTag: 'getmeili/meilisearch:v1.8',
    healthcheckCmd: 'curl -f http://localhost:7700/health',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
  },
  {
    id: 'minio',
    name: 'MinIO (S3-Compatible Object Store)',
    defaultPort: 9000,
    category: 'storage',
    description: 'High-performance distributed S3 object storage suite with integrated web management console on :9001.',
    imageTag: 'minio/minio:latest',
    healthcheckCmd: 'curl -f http://localhost:9000/minio/health/live',
    badgeColor: 'bg-rose-600/20 text-rose-300 border-rose-600/40'
  },
  {
    id: 'scylladb',
    name: 'ScyllaDB (Ultra-Fast Cassandra)',
    defaultPort: 9042,
    category: 'relational',
    description: 'C++ rewrite of Apache Cassandra delivering sub-millisecond p99 latencies for high-throughput distributed NoSQL.',
    isHeavyMemory: true,
    imageTag: 'scylladb/scylla:5.4',
    healthcheckCmd: 'nodetool status | grep -q "UN"',
    badgeColor: 'bg-sky-600/20 text-sky-300 border-sky-600/40'
  },
  {
    id: 'rabbitmq',
    name: 'RabbitMQ (Message Broker + GUI)',
    defaultPort: 5672,
    category: 'message-broker',
    description: 'Battle-tested AMQP message broker with web management dashboard on :15672 for event-driven decoupled systems.',
    imageTag: 'rabbitmq:3-management-alpine',
    healthcheckCmd: 'rabbitmq-diagnostics check_running',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  },
  {
    id: 'kafka',
    name: 'Apache Kafka (Event Streaming / KRaft)',
    defaultPort: 9092,
    category: 'message-broker',
    description: 'Distributed event streaming platform for high-throughput pub/sub, real-time analytics, and event-driven microservices.',
    imageTag: 'apache/kafka:3.7.0',
    healthcheckCmd: '/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092',
    badgeColor: 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40'
  },

  // ─── Cloud & BaaS Providers ────────────────────────────────────────

  {
    id: 'supabase',
    name: 'Supabase (Postgres + Auth + Realtime)',
    defaultPort: 0,
    category: 'baas',
    description: 'Open-source Firebase alternative with managed Postgres, real-time subscriptions, authentication, edge functions, and S3-compatible storage.',
    isCloud: true,
    sdkPackages: {
      npm: '@supabase/supabase-js',
      pip: 'supabase',
      go: 'github.com/supabase-community/supabase-go',
      cargo: 'postgrest-rs',
      nuget: 'Supabase',
      composer: 'supabase/supabase-php'
    },
    envVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    docsUrl: 'https://supabase.com/dashboard',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'firebase',
    name: 'Firebase (Firestore + Auth + Storage)',
    defaultPort: 0,
    category: 'baas',
    description: 'Google\'s app development platform with Firestore NoSQL database, Authentication, Cloud Storage, Hosting, and Cloud Functions.',
    isCloud: true,
    sdkPackages: {
      npm: 'firebase firebase-admin',
      pip: 'firebase-admin',
      go: 'firebase.google.com/go/v4',
      nuget: 'FirebaseAdmin',
      composer: 'kreait/firebase-php'
    },
    envVars: ['FIREBASE_PROJECT_ID', 'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_STORAGE_BUCKET'],
    docsUrl: 'https://console.firebase.google.com',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'planetscale',
    name: 'PlanetScale (Serverless MySQL)',
    defaultPort: 0,
    category: 'cloud-db',
    description: 'Serverless MySQL platform built on Vitess with branching, non-blocking schema changes, and unlimited scale.',
    isCloud: true,
    sdkPackages: {
      npm: '@planetscale/database',
      pip: 'planetscale-connector-python',
      go: 'github.com/planetscale/planetscale-go'
    },
    envVars: ['DATABASE_URL'],
    docsUrl: 'https://app.planetscale.com',
    badgeColor: 'bg-slate-400/20 text-slate-200 border-slate-400/40'
  },
  {
    id: 'neon',
    name: 'Neon (Serverless Postgres)',
    defaultPort: 0,
    category: 'cloud-db',
    description: 'Serverless Postgres with autoscaling, branching, and bottomless storage. Scale to zero when inactive.',
    isCloud: true,
    sdkPackages: {
      npm: '@neondatabase/serverless',
      pip: 'psycopg2-binary',
      go: 'github.com/jackc/pgx/v5'
    },
    envVars: ['DATABASE_URL', 'NEON_DATABASE_URL'],
    docsUrl: 'https://console.neon.tech',
    badgeColor: 'bg-green-400/20 text-green-300 border-green-400/40'
  },
  {
    id: 'turso',
    name: 'Turso (Edge SQLite / libSQL)',
    defaultPort: 0,
    category: 'cloud-db',
    description: 'Edge-hosted SQLite-compatible database built on libSQL with multi-region replication and embedded replicas.',
    isCloud: true,
    sdkPackages: {
      npm: '@libsql/client',
      pip: 'libsql-experimental',
      go: 'github.com/tursodatabase/libsql-client-go',
      cargo: 'libsql'
    },
    envVars: ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'],
    docsUrl: 'https://turso.tech/app',
    badgeColor: 'bg-teal-400/20 text-teal-300 border-teal-400/40'
  },
  {
    id: 'upstash',
    name: 'Upstash (Serverless Redis + Kafka)',
    defaultPort: 0,
    category: 'cloud-db',
    description: 'Serverless Redis and Kafka with per-request pricing, REST API, and global replication. Perfect for edge functions.',
    isCloud: true,
    sdkPackages: {
      npm: '@upstash/redis @upstash/ratelimit',
      pip: 'upstash-redis',
      go: 'github.com/upstash/redis-go'
    },
    envVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    docsUrl: 'https://console.upstash.com',
    badgeColor: 'bg-red-400/20 text-red-300 border-red-400/40'
  },
  {
    id: 'appwrite',
    name: 'Appwrite (Open-Source BaaS)',
    defaultPort: 0,
    category: 'baas',
    description: 'Self-hosted or cloud backend server with databases, auth, functions, storage, and real-time events out of the box.',
    isCloud: true,
    sdkPackages: {
      npm: 'appwrite node-appwrite',
      pip: 'appwrite',
      go: 'github.com/appwrite/sdk-for-go',
      composer: 'appwrite/appwrite'
    },
    envVars: ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY'],
    docsUrl: 'https://cloud.appwrite.io',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  {
    id: 'convex',
    name: 'Convex (Reactive Backend)',
    defaultPort: 0,
    category: 'baas',
    description: 'Full-stack TypeScript backend with real-time reactive queries, serverless functions, file storage, and automatic caching.',
    isCloud: true,
    sdkPackages: {
      npm: 'convex'
    },
    envVars: ['CONVEX_URL', 'CONVEX_DEPLOY_KEY'],
    docsUrl: 'https://dashboard.convex.dev',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40'
  },
  {
    id: 'pocketbase',
    name: 'Pocketbase (Single-Binary BaaS)',
    defaultPort: 8090,
    category: 'baas',
    description: 'Open-source backend in a single Go binary: embedded SQLite database, real-time subscriptions, auth, file storage, and admin dashboard.',
    imageTag: 'ghcr.io/muchobien/pocketbase:latest',
    healthcheckCmd: 'wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1',
    sdkPackages: {
      npm: 'pocketbase',
      pip: 'pocketbase'
    },
    envVars: ['POCKETBASE_URL'],
    docsUrl: 'https://pocketbase.io/docs',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  }
]
