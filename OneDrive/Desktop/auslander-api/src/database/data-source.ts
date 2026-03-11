import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { Project } from '../projects/project.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'auslander_db',
  entities: [Tenant, User, Project],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
