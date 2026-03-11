import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Creates a project scoped to the authenticated user's tenant.
   * The tenantId is derived from the JWT token — never from user input.
   */
  async create(createProjectDto: CreateProjectDto, tenantId: string): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      tenantId,
    });
    return this.projectRepository.save(project);
  }

  /**
   * Returns ONLY projects belonging to the authenticated user's tenant.
   * This is the core tenant isolation enforcement point.
   */
  async findAllForTenant(tenantId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}
