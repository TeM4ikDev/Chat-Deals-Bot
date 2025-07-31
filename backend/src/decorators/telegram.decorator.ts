import { ITelegramCommand } from '@/types/types';
import { SetMetadata } from '@nestjs/common';

export const Command = (command: ITelegramCommand) => {
  return SetMetadata('telegramCommand', command);
};
