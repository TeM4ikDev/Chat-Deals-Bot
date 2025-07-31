import { PartialType } from '@nestjs/mapped-types';
import { CreateScamformDto } from './create-scamform.dto';

export class UpdateScamformDto extends PartialType(CreateScamformDto) {}
