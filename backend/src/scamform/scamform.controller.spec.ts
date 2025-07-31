import { Test, TestingModule } from '@nestjs/testing';
import { ScamformController } from './scamform.controller';
import { ScamformService } from './scamform.service';

describe('ScamformController', () => {
  let controller: ScamformController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScamformController],
      providers: [ScamformService],
    }).compile();

    controller = module.get<ScamformController>(ScamformController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
