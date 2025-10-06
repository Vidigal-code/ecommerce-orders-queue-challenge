import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { OrdersStatusController } from '../src/presentation/controllers/orders-status.controller';
import { LogsUseCase } from '../src/application/use-cases/logs.usecase';
import { OrdersQueueService } from '../src/infrastructure/queue/services/orders-queue.service';
import { OrdersProcessStateService } from '../src/infrastructure/queue/services/orders-process-state.service';
import { LogViewer } from '../src/shared/logs/log.viewer';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [OrdersStatusController],
      providers: [
        {
          provide: LogsUseCase,
          useValue: {
            getProcessLog: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: OrdersQueueService,
          useValue: {
            getCounts: jest.fn().mockResolvedValue({
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
              paused: false,
            }),
          },
        },
        {
          provide: OrdersProcessStateService,
          useValue: {
            getPhase: jest.fn().mockReturnValue('IDLE'),
            getEnqueueVipTimeMs: jest.fn().mockReturnValue(0),
            getEnqueueNormalTimeMs: jest.fn().mockReturnValue(0),
          },
        },
        {
          provide: LogViewer,
          useValue: {
            getLogs: jest.fn().mockResolvedValue({
              logMessages: [],
              warnMessages: [],
              errorMessages: [],
            }),
          },
        },
        {
          provide: 'IProcessRunRepository',
          useValue: null,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/orders/health/queue (GET)', () => {
    return request(app.getHttpServer())
      .get('/orders/health/queue')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('queue');
      });
  });
});
