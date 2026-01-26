import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Conversation } from '../conversation/entities/conversation.entity';
import { Message } from '../conversation/entities/message.entity';
import { GenUIComponent } from '../conversation/entities/genui-component.entity';
import { RAGContext } from '../conversation/entities/rag-context.entity';

/**
 * 数据库配置模块
 * 支持 SQLite 和 PostgreSQL
 * 
 * 实体配置：显式导入所有实体类，确保 TypeORM 能正确加载元数据
 */
export const databaseConfig = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const dbType = configService.get<string>('DB_TYPE') || 'sqlite';

    // 所有实体类（显式导入，避免路径扫描问题）
    const entities = [Conversation, Message, GenUIComponent, RAGContext];

    // SQLite 配置（开发环境推荐）
    if (dbType === 'sqlite') {
      return {
        type: 'better-sqlite3',
        database: configService.get<string>('DB_DATABASE') || './data/aivista.db',
        entities,
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE') !== false,
        logging: configService.get<boolean>('DB_LOGGING') === true,
        driver: require('better-sqlite3'),
      };
    }

    // PostgreSQL 配置（生产环境推荐）
    return {
      type: 'postgres',
      host: configService.get<string>('DB_HOST') || 'localhost',
      port: configService.get<number>('DB_PORT') || 5432,
      username: configService.get<string>('DB_USER') || 'postgres',
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_NAME') || 'aivista',
      entities,
      synchronize: configService.get<boolean>('DB_SYNCHRONIZE') !== false,
      logging: configService.get<boolean>('DB_LOGGING') === true,
      ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    };
  },
});
