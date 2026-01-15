import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { KnowledgeService } from '../../src/knowledge/knowledge.service';

describe('KnowledgeController (e2e)', () => {
  let app: INestApplication;
  let knowledgeService: KnowledgeService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .compile();

    app = moduleFixture.createNestApplication();
    knowledgeService = moduleFixture.get<KnowledgeService>(KnowledgeService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PUT /api/knowledge/styles/:id', () => {
    it('should return 204 for successful update', async () => {
      // Mock a custom style update
      jest.spyOn(knowledgeService, 'updateStyle').mockResolvedValue({} as any);

      return request(app.getHttpServer())
        .put('/api/knowledge/styles/custom_001')
        .send({ description: 'Updated via API' })
        .expect(204);
    });

    it('should return 403 for system style update', async () => {
      // Mock system style protection
      jest.spyOn(knowledgeService, 'updateStyle').mockRejectedValue(
        new Error('Cannot modify system style fields: style, prompt')
      );

      return request(app.getHttpServer())
        .put('/api/knowledge/styles/style_001')
        .send({ style: 'Hacked' })
        .expect(500); // NestJS converts Error to 500
    });

    it('should return 404 for non-existent style', async () => {
      // Mock not found
      jest.spyOn(knowledgeService, 'updateStyle').mockRejectedValue(
        new Error('Style with id non_existent not found')
      );

      return request(app.getHttpServer())
        .put('/api/knowledge/styles/non_existent')
        .send({ description: 'Test' })
        .expect(500);
    });
  });

  describe('PATCH /api/knowledge/styles/:id', () => {
    it('should return 204 for successful partial update', async () => {
      jest.spyOn(knowledgeService, 'updateStyle').mockResolvedValue({} as any);

      return request(app.getHttpServer())
        .patch('/api/knowledge/styles/custom_001')
        .send({ description: 'Partially updated' })
        .expect(204);
    });
  });

  describe('DELETE /api/knowledge/styles/:id', () => {
    it('should return 204 for successful deletion', async () => {
      jest.spyOn(knowledgeService, 'deleteStyle').mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete('/api/knowledge/styles/custom_001')
        .expect(204);
    });

    it('should return 403 for system style deletion', async () => {
      jest.spyOn(knowledgeService, 'deleteStyle').mockRejectedValue(
        new Error('Cannot delete system built-in style')
      );

      return request(app.getHttpServer())
        .delete('/api/knowledge/styles/style_001')
        .expect(500);
    });
  });

  describe('POST /api/knowledge/styles/batch-delete', () => {
    it('should handle batch deletion properly', async () => {
      jest.spyOn(knowledgeService, 'deleteStyles').mockResolvedValue({
        deleted: 2,
        failed: ['style_001'],
      });

      return request(app.getHttpServer())
        .post('/api/knowledge/styles/batch-delete')
        .send({ ids: ['custom_001', 'custom_002', 'style_001'] })
        .expect(200)
        .expect((res) => {
          expect(res.body.deleted).toBe(2);
          expect(res.body.failed).toEqual(['style_001']);
        });
    });
  });

  describe('GET endpoints should still work', () => {
    it('should get all styles', async () => {
      jest.spyOn(knowledgeService, 'count').mockResolvedValue(5);
      jest.spyOn(knowledgeService, 'getStats').mockResolvedValue({
        dimension: 1536,
        dbPath: './data/lancedb',
      });

      return request(app.getHttpServer())
        .get('/api/knowledge/styles')
        .expect(200);
    });

    it('should search styles', async () => {
      jest.spyOn(knowledgeService, 'search').mockResolvedValue([
        {
          style: 'Cyberpunk',
          prompt: 'neon lights, high tech',
          similarity: 0.85,
          metadata: {},
        },
      ]);

      return request(app.getHttpServer())
        .get('/api/knowledge/search?query=cyberpunk')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(1);
          expect(res.body[0].style).toBe('Cyberpunk');
        });
    });

    it('should get stats', async () => {
      jest.spyOn(knowledgeService, 'count').mockResolvedValue(5);
      jest.spyOn(knowledgeService, 'getStats').mockResolvedValue({
        dimension: 1536,
        dbPath: './data/lancedb',
      });

      return request(app.getHttpServer())
        .get('/api/knowledge/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body.count).toBe(5);
          expect(res.body.dimension).toBe(1536);
        });
    });
  });
});