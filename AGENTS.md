# AiVista Agent Development Guide

This guide provides conventions and commands for agentic coding agents working in the AiVista multi-platform AI application codebase.

## Project Architecture

AiVista is a multi-platform AI application with three main components:
- **Backend**: NestJS server with LangGraph for AI workflow orchestration
- **Web**: Next.js frontend with TypeScript, React, and Tailwind CSS
- **Mobile**: Flutter client app

## Development Commands

### Backend (server/)
```bash
# Development
pnpm run start:dev          # Start with hot reload
pnpm run start:debug        # Start with debugging
pnpm run start:prod         # Start production build

# Building and Testing
pnpm run build              # Build the application
pnpm run test               # Run all tests
pnpm run test:watch         # Run tests in watch mode
pnpm run test:cov           # Run tests with coverage
pnpm run test:e2e           # Run end-to-end tests

# Single Test
pnpm run test -- path/to/file.spec.ts

# Code Quality
pnpm run lint               # Run ESLint
pnpm run format             # Format with Prettier
```

### Web Frontend (web/)
```bash
# Development
pnpm run dev                # Start development server (port 3001)
pnpm run build              # Build for production
pnpm run start              # Start production server
pnpm run lint               # Run ESLint
```

### Mobile Client (client/)
```bash
# Flutter (requires FVM 3.38.5)
fvm flutter run             # Run app
fvm flutter test            # Run all tests
fvm flutter build apk       # Build Android APK
fvm flutter build ios       # Build iOS app
fvm flutter analyze         # Run static analysis

# Single Test
fvm flutter test path/to/test.dart
```

### Global Commands
```bash
./start.sh backend          # Start only backend
./start.sh frontend         # Start only Flutter
./start.sh web              # Start only Next.js
./start.sh all              # Start all services (default)
```

## Code Style Guidelines

### TypeScript (Backend & Web)
- Use strict TypeScript with proper type definitions
- ES6 import/export syntax preferred
- Use decorators extensively in NestJS backend
- Path aliases: `@/*` for web root-relative imports
- File naming: camelCase for services/controllers, PascalCase for components

### Backend (NestJS)
```typescript
// Standard imports
import { Injectable, Inject, Logger } from '@nestjs/common';
import { AgentState } from './interfaces/agent-state.interface';

// Decorator pattern
@Injectable()
export class AgentService {
  constructor(
    @Inject('AGENT_GRAPH')
    private readonly graph: any,
  ) {}
}
```

### Web (Next.js/React)
```typescript
// Component imports with path aliases
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';

// shadcn/ui pattern
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
);
```

### Dart (Flutter)
- Use flutter_lints for code style
- Provider pattern for state management
- JSON serialization with json_annotation
- Material Design components

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});
}
```

## Import Conventions

### Backend Structure
- Services end with `.service.ts`
- Controllers end with `.controller.ts`
- Interfaces end with `.interface.ts`
- DTOs end with `.dto.ts`
- Use relative imports for same-level modules

### Web Structure
- Components in `components/` with PascalCase
- Hooks in `hooks/` with `use` prefix
- Utils in `lib/utils.ts`
- Types in `types/` with `.type.ts`

### Flutter Structure
- Screens in `lib/screens/`
- Widgets in `lib/widgets/`
- Services in `lib/services/`
- Models in `lib/models/`

## Error Handling

### Backend Error Handling
- Use NestJS ValidationPipe for request validation
- Implement async generators for streaming responses
- Use SSE events for real-time communication

```typescript
// Streaming with error boundaries
async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
  try {
    for await (const chunk of stream) {
      yield { event: 'thought', data: chunk };
    }
  } catch (error) {
    this.logger.error('Workflow execution failed', error);
    yield { event: 'error', data: error.message };
  }
}
```

### Web Error Handling
- Use React error boundaries for component errors
- Implement proper loading states
- Handle API errors with toast notifications

### Flutter Error Handling
- Use try-catch blocks for async operations
- Implement proper error states in UI
- Use Flutter's error widget for unhandled errors

## AI Agent Workflow

The backend uses LangGraph with this node structure:
1. **Planner**: Analyzes user request and creates plan
2. **RAG**: Retrieves relevant context from knowledge base
3. **Executor**: Executes the planned actions
4. **Critic**: Reviews and validates results

## Database and Storage

- **LanceDB**: Vector database for embeddings and knowledge base
- **Environment Variables**: All configuration via `.env` files
- Use `@nestjs/config` for configuration management

## Testing Patterns

### Backend Testing
- Use Jest with ts-jest
- Test files end with `.spec.ts`
- Mock external dependencies
- Test both happy paths and error cases

### Flutter Testing
- Widget tests for UI components
- Unit tests for business logic
- Integration tests for user flows

## Configuration

### Environment Variables
Reference `.env.example` in each module:
- Backend: Database URLs, API keys, LLM provider settings
- Web: API endpoints, feature flags
- Mobile: Server URLs, API configurations

### Build Configuration
- Backend: CommonJS modules, ES2022 target
- Web: ESNext modules with Next.js optimizations
- Flutter: Managed via FVM for version consistency

## Development Workflow

1. Run `./start.sh all` to start all services
2. Backend runs on default NestJS port
3. Web frontend runs on port 3001
4. Mobile app connects to backend via HTTP/SSE
5. Use Cursor plans in `.cursor/plans/` for feature guidance

## Code Review Guidelines

- Ensure proper TypeScript types
- Verify error handling implementation
- Check for security best practices
- Validate environment variable usage
- Confirm proper logging and monitoring
- Test streaming functionality end-to-end

## Performance Considerations

- Use async/await consistently
- Implement proper caching strategies
- Optimize bundle sizes (web)
- Use efficient state management patterns
- Monitor AI workflow execution times