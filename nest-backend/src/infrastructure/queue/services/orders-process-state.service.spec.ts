import { OrdersProcessStateService } from './orders-process-state.service';

describe('OrdersProcessStateService', () => {
  let service: OrdersProcessStateService;

  beforeEach(() => {
    service = new OrdersProcessStateService();
  });

  it('should manage phase lifecycle', () => {
    expect(service.getPhase()).toBe('IDLE');

    service.setPhase('GENERATING');
    expect(service.getPhase()).toBe('GENERATING');

    service.resetAll();
    expect(service.getPhase()).toBe('IDLE');
  });

  it('should handle abort flags and enqueue timings', () => {
    expect(service.isAborting()).toBe(false);

    service.setAborted(true);
    expect(service.isAborting()).toBe(true);

    service.setEnqueueVipTime(1250);
    service.setEnqueueNormalTime(2750);

    expect(service.getEnqueueVipTimeMs()).toBe(1250);
    expect(service.getEnqueueNormalTimeMs()).toBe(2750);

    service.resetAll();

    expect(service.isAborting()).toBe(false);
    expect(service.getEnqueueVipTimeMs()).toBe(0);
    expect(service.getEnqueueNormalTimeMs()).toBe(0);
  });

  it('should track active generation job id', () => {
    expect(service.hasActiveGeneration()).toBe(false);

    service.setActiveGenerateJobId('job-123');
    expect(service.hasActiveGeneration()).toBe(true);

    service.setActiveGenerateJobId(null);
    expect(service.hasActiveGeneration()).toBe(false);
  });
});
