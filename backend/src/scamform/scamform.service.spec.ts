import { Test, TestingModule } from '@nestjs/testing';
import { ScamformService } from './scamform.service';

describe('ScamformService', () => {
  let service: ScamformService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScamformService],
    }).compile();

    service = module.get<ScamformService>(ScamformService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
