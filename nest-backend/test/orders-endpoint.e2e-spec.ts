import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.mock('uuid', () => ({ v4: () => 'test-run-id' }));

jest.setTimeout(60000);

describe('Orders endpoint contract (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /orders returns base structure', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const res = await request(server).get('/orders').expect(200);
    
    // Verify core fields required by challenge specs
    expect(res.body).toHaveProperty('contractVersion');
    expect(res.body).toHaveProperty('generationTimeMs');
    expect(res.body).toHaveProperty('enqueueVipTimeMs');
    expect(res.body).toHaveProperty('enqueueNormalTimeMs');
    expect(res.body).toHaveProperty('totalTimeMs');
    expect(res.body).toHaveProperty('phase');
    
    // Count fields
    expect(res.body).toHaveProperty('counts');
    expect(res.body.counts).toHaveProperty('vip');
    expect(res.body.counts).toHaveProperty('normal');
    
    // Processing fields for both priority types
    expect(res.body).toHaveProperty('processing');
    expect(res.body.processing).toHaveProperty('vip');
    expect(res.body.processing).toHaveProperty('normal');
    
    // VIP processing details
    expect(res.body.processing.vip).toHaveProperty('count');
    expect(res.body.processing.vip).toHaveProperty('timeMs');
    expect(res.body.processing.vip).toHaveProperty('start');
    expect(res.body.processing.vip).toHaveProperty('end');
    
    // Normal processing details
    expect(res.body.processing.normal).toHaveProperty('count');
    expect(res.body.processing.normal).toHaveProperty('timeMs');
    expect(res.body.processing.normal).toHaveProperty('start');
    expect(res.body.processing.normal).toHaveProperty('end');
    
    // Additional performance metrics
    expect(res.body).toHaveProperty('throughput');
    expect(res.body).toHaveProperty('progress');
    expect(res.body).toHaveProperty('eta');
  });
});
