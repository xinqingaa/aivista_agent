import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * 数据库配置模块
 * 支持 SQLite 和 PostgreSQL
 */
export const databaseConfig = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const dbType = configService.get<string>('DB_TYPE') || 'sqlite';

    // SQLite 配置（开发环境推荐）
    if (dbType === 'sqlite') {
      return {
        type: 'better-sqlite3',
        database: configService.get<string>('DB_DATABASE') || './data/aivista.db',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: configService.get<boolean>('DB_SYNCHRONIZE') !== false,
      logging: configService.get<boolean>('DB_LOGGING') === true,
      ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    };
  },
});
