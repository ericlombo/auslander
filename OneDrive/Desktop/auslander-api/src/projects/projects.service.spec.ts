import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from './project.entity';

const TENANT_A = 'tenant-a-uuid';
const TENANT_B = 'tenant-b-uuid';

const projectsInDb = [
  { id: 'p1', name: 'Project Alpha', tenantId: TENANT_A, createdAt: new Date() },
  { id: 'p2', name: 'Project Beta', tenantId: TENANT_A, createdAt: new Date() },
  { id: 'p3', name: 'Project Gamma', tenantId: TENANT_B, createdAt: new Date() },
];

const mockRepo = {
  create: jest.fn((dto) => dto),
  save: jest.fn((project) => Promise.resolve({ id: 'new-uuid', ...project, createdAt: new Date() })),
  find: jest.fn(({ where }) =>
    Promise.resolve(projectsInDb.filter((p) => p.tenantId === where.tenantId)),
  ),
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project with the tenant from JWT (not user input)', async () => {
      mockRepo.create.mockReturnValue({ name: 'New Project', tenantId: TENANT_A });
      mockRepo.save.mockResolvedValue({ id: 'new-uuid', name: 'New Project', tenantId: TENANT_A, createdAt: new Date() });

      const result = await service.create({ name: 'New Project' }, TENANT_A);

      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Project', tenantId: TENANT_A });
      expect(result.tenantId).toBe(TENANT_A);
    });
  });

  describe('findAllForTenant — isolation tests', () => {
    it('should return only Tenant A projects for Tenant A', async () => {
      mockRepo.find.mockResolvedValue(projectsInDb.filter((p) => p.tenantId === TENANT_A));
      const results = await service.findAllForTenant(TENANT_A);
      expect(results).toHaveLength(2);
      results.forEach((p) => expect(p.tenantId).toBe(TENANT_A));
    });

    it('should return only Tenant B projects for Tenant B', async () => {
      mockRepo.find.mockResolvedValue(projectsInDb.filter((p) => p.tenantId === TENANT_B));
      const results = await service.findAllForTenant(TENANT_B);
      expect(results).toHaveLength(1);
      expect(results[0].tenantId).toBe(TENANT_B);
    });

    it('should never return cross-tenant data', async () => {
      mockRepo.find.mockResolvedValue(projectsInDb.filter((p) => p.tenantId === TENANT_A));
      const results = await service.findAllForTenant(TENANT_A);
      const leaked = results.filter((p) => p.tenantId === TENANT_B);
      expect(leaked).toHaveLength(0);
    });
  });
});
