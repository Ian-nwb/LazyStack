import { CartApp, DatabaseAdminUi, DatabaseType, SelectedDatabase } from '../types'

export interface DatabaseAdminUiOption {
  id: DatabaseAdminUi
  name: string
  defaultPort: number
  containerPort: number
  hostProcess?: boolean
}

const ADMIN_UI_OPTIONS: Partial<Record<DatabaseType, DatabaseAdminUiOption[]>> = {
  postgres: [
    { id: 'adminer', name: 'Adminer', defaultPort: 8088, containerPort: 8080 },
    { id: 'pgadmin', name: 'pgAdmin', defaultPort: 5050, containerPort: 80 },
    { id: 'prisma-studio', name: 'Prisma Studio', defaultPort: 5555, containerPort: 5555, hostProcess: true }
  ],
  mysql: [
    { id: 'adminer', name: 'Adminer', defaultPort: 8088, containerPort: 8080 },
    { id: 'phpmyadmin', name: 'phpMyAdmin', defaultPort: 8082, containerPort: 80 },
    { id: 'prisma-studio', name: 'Prisma Studio', defaultPort: 5555, containerPort: 5555, hostProcess: true }
  ],
  mariadb: [
    { id: 'adminer', name: 'Adminer', defaultPort: 8088, containerPort: 8080 },
    { id: 'phpmyadmin', name: 'phpMyAdmin', defaultPort: 8082, containerPort: 80 },
    { id: 'prisma-studio', name: 'Prisma Studio', defaultPort: 5555, containerPort: 5555, hostProcess: true }
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

export function getDatabaseAdminUiCommandName(db: SelectedDatabase, index: number, apps: CartApp[]): string {
  const customName = db.customName?.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '')
  const assignedApp = apps.find(app => app.id === db.assignedAppId)
  const name = customName || (assignedApp ? `${assignedApp.folderName}_${db.type}` : index > 0 ? `${db.type}_${index + 1}` : db.type)
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
}
