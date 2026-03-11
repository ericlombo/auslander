import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { Project } from './project.entity';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new project',
    description: 'Creates a project automatically scoped to the authenticated user\'s tenant. The tenant is derived from the JWT token — it cannot be overridden.',
  })
  @ApiResponse({ status: 201, description: 'Project created', type: Project })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: User,
  ): Promise<Project> {
    // tenantId comes from the verified JWT — never from user-supplied body
    return this.projectsService.create(createProjectDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'List all projects for the authenticated user\'s tenant',
    description: 'Returns only projects that belong to the same tenant as the authenticated user. Strict isolation is enforced.',
  })
  @ApiResponse({ status: 200, description: 'List of projects', type: [Project] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: User): Promise<Project[]> {
    return this.projectsService.findAllForTenant(user.tenantId);
  }
}
