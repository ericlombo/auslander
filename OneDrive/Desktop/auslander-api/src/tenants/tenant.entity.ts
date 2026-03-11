import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';
import { Project } from '../projects/project.entity';

@Entity('tenants')
export class Tenant {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Acme Corp' })
  @Column({ unique: true })
  name: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Project, (project) => project.tenant)
  projects: Project[];
}
