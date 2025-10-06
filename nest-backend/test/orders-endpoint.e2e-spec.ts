import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { OrdersStatusController } from '../src/presentation/controllers/orders-status.controller';
import { LogsUseCase } from '../src/application/use-cases/logs.usecase';
import { OrdersQueueService } from '../src/infrastructure/queue/services/orders-queue.service';
import { OrdersProcessStateService } from '../src/infrastructure/queue/services/orders-process-state.service';
import { LogViewer } from '../src/shared/logs/log.viewer';

describe('OrdersStatusController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [OrdersStatusController],
      providers: [
        {
          provide: LogsUseCase,
          useValue: {
            getProcessLog: jest.fn().mockResolvedValue({
              generationTimeMs: 1000,
              enqueueVipTimeMs: 500,
              enqueueNormalTimeMs: 500,
              processingTimeVIPMs: 2000,
              processingTimeNormalMs: 3000,
              totalProcessedVIP: 100,
              totalProcessedNormal: 900,
              totalTimeMs: 6000,
              startVIP: new Date(),
              endVIP: new Date(),
              startNormal: new Date(),
              endNormal: new Date(),
              phase: 'COMPLETED',
              throughput: { vip: 50, normal: 300, overall: 250 },
              eta: { estimatedMs: null, progressPercent: 100 },
              target: 1000,
              generated: 1000,
            }),
          },
        },
        {
          provide: OrdersQueueService,
          useValue: {
            getCounts: jest.fn().mockResolvedValue({
              waiting: 0,
              active: 0,
              completed: 1000,
              failed: 0,
              delayed: 0,
              paused: false,
            }),
          },
        },
        {
          provide: OrdersProcessStateService,
          useValue: {
            getPhase: jest.fn().mockReturnValue('COMPLETED'),
            getEnqueueVipTimeMs: jest.fn().mockReturnValue(500),
            getEnqueueNormalTimeMs: jest.fn().mockReturnValue(500),
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
          useValue: {
            findLatest: jest.fn().mockResolvedValue({ runId: 'test-run' }),
          },
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

  it('/orders (GET) should return order status', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('generationTimeMs');
        expect(res.body).toHaveProperty('enqueueVipTimeMs');
        expect(res.body).toHaveProperty('enqueueNormalTimeMs');
        expect(res.body).toHaveProperty('processing');
        expect(res.body.processing).toHaveProperty('vip');
        expect(res.body.processing).toHaveProperty('normal');
        expect(res.body.processing.vip).toHaveProperty('start');
        expect(res.body.processing.vip).toHaveProperty('end');
        expect(res.body.processing.vip).toHaveProperty('timeMs');
        expect(res.body.processing.vip).toHaveProperty('count');
        expect(res.body.processing.normal).toHaveProperty('start');
        expect(res.body.processing.normal).toHaveProperty('end');
        expect(res.body.processing.normal).toHaveProperty('timeMs');
        expect(res.body.processing.normal).toHaveProperty('count');
        expect(res.body).toHaveProperty('totalTimeMs');
        expect(res.body).toHaveProperty('counts');
        expect(res.body.counts).toHaveProperty('vip');
        expect(res.body.counts).toHaveProperty('normal');
        expect(res.body).toHaveProperty('phase');
        expect(res.body).toHaveProperty('throughput');
        expect(res.body.throughput).toHaveProperty('vip');
        expect(res.body.throughput).toHaveProperty('normal');
        expect(res.body.throughput).toHaveProperty('overall');
        expect(res.body).toHaveProperty('eta');
        expect(res.body.eta).toHaveProperty('estimatedMs');
        expect(res.body.eta).toHaveProperty('progressPercent');
        expect(res.body).toHaveProperty('progress');
        expect(res.body.progress).toHaveProperty('target');
        expect(res.body.progress).toHaveProperty('generated');
        expect(res.body.progress).toHaveProperty('processedTotal');
      });
  });
});