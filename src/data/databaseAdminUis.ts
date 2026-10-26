import { DatabaseAdminUi, DatabaseType } from '../types'

export interface DatabaseAdminUiOption {
  id: DatabaseAdminUi
  name: string
  defaultPort: number
  containerPort: number
}

const ADMIN_UI_OPTIONS: Partial<Record<DatabaseType, DatabaseAdminUiOption[]>> = {
  postgres: [
    { id: 'adminer', name: 'Adminer', defaultPort: 8088, containerPort: 8080 },
    { id: 'pgadmin', name: 'pgAdmin', defaultPort: 5050, containerPort: 80 }
  ],
  mysql: [
    { id: 'adminer', name: 'Adminer', defaultPort: 8088, containerPort: 8080 },
    { id: 'phpmyadmin', name: 'phpMyAdmin', defaultPort: 8082, containerPort: 80 }
  ],
  mariadb: [
    { id: 'adminer', name: 'Adminer', defaultPort: 8088, containerPort: 8080 },
    { id: 'phpmyadmin', name: 'phpMyAdmin', defaultPort: 8082, containerPort: 80 }
  ],
  mongodb: [
    { id: 'mongo-express', name: 'Mongo Express', defaultPort: 8081, containerPort: 8081 }
  ],
  redis: [
    { id: 'redis-commander', name: 'Redis Commander', defaultPort: 8089, containerPort: 8081 }
  ],
  valkey: [
    { id: 'redis-commander', name: 'Redis Commander', defaultPort: 8089, containerPort: 8081 }
  ]
}

export function getDatabaseAdminUiOptions(type: DatabaseType): DatabaseAdminUiOption[] {
  return ADMIN_UI_OPTIONS[type] || []
}

export function getDatabaseAdminUiOption(type: DatabaseType, ui?: DatabaseAdminUi): DatabaseAdminUiOption | undefined {
  return getDatabaseAdminUiOptions(type).find(option => option.id === ui)
}
