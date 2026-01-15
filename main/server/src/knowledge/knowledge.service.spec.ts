import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KnowledgeService } from '../../src/knowledge/knowledge.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateStyleDto } from '../../src/knowledge/dto/update-style.dto';
import { StyleData } from '../../src/knowledge/data/initial-styles';

// Mock embedding service
const mockEmbeddingService = {
  embed: jest.fn(),
  embedBatch: jest.fn(),
  getDimension: jest.fn().mockReturnValue(1536),
};

describe('KnowledgeService - CRUD Operations', () => {
  let service: KnowledgeService;
  let module: TestingModule;

  // Mock LanceDB table and database
  const mockTable = {
    search: jest.fn(),
    add: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    countRows: jest.fn(),
    toArray: jest.fn(),
  };

  const mockDb = {
    openTable: jest.fn(),
    createTable: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    module = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        {
          provide: 'EMBEDDING_SERVICE',
          useValue: mockEmbeddingService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'VECTOR_DB_PATH') return './test-lancedb';
              if (key === 'FORCE_INIT_KNOWLEDGE_BASE') return 'false';
              return undefined;
            }),
          },
        },
      ],
    })
    .compile();

    service = module.get<KnowledgeService>(KnowledgeService);

    // Mock database initialization
    (service as any).table = mockTable;
    (service as any).db = mockDb;
    (service as any).isInitialized = true;
  });

  describe('deleteStyle', () => {
    it('should delete custom style successfully', async () => {
      const customId = 'custom_001';
      
      // Mock not a system style
      jest.spyOn(service as any, 'isSystemStyle').mockResolvedValue(false);
      mockTable.delete.mockResolvedValue(undefined);

      await expect(service.deleteStyle(customId)).resolves.not.toThrow();
      expect(mockTable.delete).toHaveBeenCalledWith(`id = '${customId}'`);
    });

    it('should throw error when trying to delete system style', async () => {
      const systemId = 'style_001';
      
      // Mock system style
      jest.spyOn(service as any, 'isSystemStyle').mockResolvedValue(true);

      await expect(service.deleteStyle(systemId)).rejects.toThrow(ForbiddenException);
      expect(mockTable.delete).not.toHaveBeenCalled();
    });

    it('should throw error when style not found in system check', async () => {
      const nonExistentId = 'non_existent';
      
      // Mock system style check failure
      jest.spyOn(service as any, 'isSystemStyle').mockResolvedValue(false);
      mockTable.delete.mockRejectedValue(new Error('Style not found'));

      await expect(service.deleteStyle(nonExistentId)).rejects.toThrow('Style not found');
    });
  });

  describe('updateStyle', () => {
    const existingStyle: StyleData = {
      id: 'custom_001',
      style: 'Custom Style',
      prompt: 'A custom test style',
      description: 'Test description',
      tags: ['test'],
      metadata: { category: 'test' },
      vector: [0.1, 0.2, 0.3],
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update custom style successfully', async () => {
      const updateData: UpdateStyleDto = {
        description: 'Updated description',
        tags: ['updated', 'tag'],
      };

      // Mock existing style retrieval
      mockTable.search.mockReturnValue({
        where: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([existingStyle]),
        }),
      });

      // Mock update
      mockTable.update.mockResolvedValue(undefined);
      mockEmbeddingService.embed.mockResolvedValue([0.4, 0.5, 0.6]);

      const result = await service.updateStyle('custom_001', updateData);
      
      expect(result.description).toBe(updateData.description);
      expect(result.tags).toEqual(updateData.tags);
      expect(mockTable.update).toHaveBeenCalled();
    });

    it('should reject updating system style core fields', async () => {
      const systemStyle = { ...existingStyle, id: 'style_001', isSystem: true };
      const updateData: UpdateStyleDto = {
        style: 'Hacked Style',
        prompt: 'Hacked prompt',
      };

      // Mock system style retrieval
      mockTable.search.mockReturnValue({
        where: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([systemStyle]),
        }),
      });

      await expect(service.updateStyle('style_001', updateData))
        .rejects.toThrow(ForbiddenException);
      expect(mockTable.update).not.toHaveBeenCalled();
    });

    it('should allow updating system style metadata', async () => {
      const systemStyle = { ...existingStyle, id: 'style_001', isSystem: true };
      const updateData: UpdateStyleDto = {
        description: 'New description',
        metadata: { newField: 'newValue' },
      };

      // Mock system style retrieval
      mockTable.search.mockReturnValue({
        where: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([systemStyle]),
        }),
      });

      // Mock update
      mockTable.update.mockResolvedValue(undefined);

      const result = await service.updateStyle('style_001', updateData);
      
      expect(result.description).toBe(updateData.description);
      expect(result.metadata).toEqual(updateData.metadata);
      expect(mockTable.update).toHaveBeenCalled();
    });

    it('should throw error when style not found', async () => {
      const updateData: UpdateStyleDto = { description: 'Test' };

      // Mock empty result
      mockTable.search.mockReturnValue({
        where: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.updateStyle('non_existent', updateData))
        .rejects.toThrow(NotFoundException);
    });

    it('should recalculate vector when prompt changes', async () => {
      const updateData: UpdateStyleDto = {
        prompt: 'New prompt text',
      };

      // Mock existing style retrieval
      mockTable.search.mockReturnValue({
        where: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([existingStyle]),
        }),
      });

      // Mock embedding service and update
      mockEmbeddingService.embed.mockResolvedValue([0.7, 0.8, 0.9]);
      mockTable.update.mockResolvedValue(undefined);

      await service.updateStyle('custom_001', updateData);
      
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith(
        `${existingStyle.style} New prompt text ${existingStyle.description || ''}`
      );
      expect(mockTable.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ vector: [0.7, 0.8, 0.9] })
        ])
      );
    });
  });

  describe('deleteStyles', () => {
    it('should handle mixed batch deletion', async () => {
      const ids = ['custom_001', 'style_001', 'non_existent'];
      
      // Mock isSystemStyle calls
      jest.spyOn(service as any, 'isSystemStyle')
        .mockResolvedValueOnce(false)  // custom_001
        .mockResolvedValueOnce(true)   // style_001 (system)
        .mockResolvedValueOnce(false); // non_existent (but will fail on delete)

      // Mock delete operations
      mockTable.delete
        .mockResolvedValueOnce(undefined)  // custom_001 success
        .mockRejectedValueOnce(new Error('Not found')); // non_existent fails

      const result = await service.deleteStyles(ids);
      
      expect(result.deleted).toBe(1);
      expect(result.failed).toEqual(['style_001', 'non_existent']);
    });

    it('should delete all successfully for custom styles only', async () => {
      const ids = ['custom_001', 'custom_002'];
      
      // Mock all as non-system styles
      jest.spyOn(service as any, 'isSystemStyle')
        .mockResolvedValue(false);

      // Mock successful deletes
      mockTable.delete.mockResolvedValue(undefined);

      const result = await service.deleteStyles(ids);
      
      expect(result.deleted).toBe(2);
      expect(result.failed).toEqual([]);
    });
  });

  describe('isSystemStyle', () => {
    it('should return true for system style IDs', async () => {
      const result = await (service as any).isSystemStyle('style_001');
      expect(result).toBe(true);
    });

    it('should return false for custom style IDs', async () => {
      const result = await (service as any).isSystemStyle('custom_001');
      expect(result).toBe(false);
    });

    it('should check database isSystem flag for unknown IDs', async () => {
      mockTable.search.mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([{ isSystem: true }]),
          }),
        }),
      });

      const result = await (service as any).isSystemStyle('unknown_001');
      expect(result).toBe(true);
    });
  });

  describe('migrateDatabase', () => {
    it('should update existing styles with system flags', async () => {
      const existingStyles = [
        { id: 'style_001', style: 'Cyberpunk' },
        { id: 'custom_001', style: 'Custom' },
        { id: 'style_002', style: 'Watercolor' },
      ];

      mockTable.search.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(existingStyles),
      });

      mockTable.update.mockResolvedValue(undefined);

      await (service as any).migrateDatabase();

      expect(mockTable.update).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'style_001', isSystem: true }),
          expect.objectContaining({ id: 'custom_001', isSystem: false }),
          expect.objectContaining({ id: 'style_002', isSystem: true }),
        ])
      );
    });

    it('should skip migration when no data exists', async () => {
      mockTable.search.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      await (service as any).migrateDatabase();

      expect(mockTable.update).not.toHaveBeenCalled();
    });

    it('should handle migration errors gracefully', async () => {
      mockTable.search.mockReturnValue({
        toArray: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      // Should not throw error
      await expect((service as any).migrateDatabase()).resolves.toBeUndefined();
    });
  });
});