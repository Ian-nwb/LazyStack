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
  }
]
