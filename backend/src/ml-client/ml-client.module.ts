import { Module } from '@nestjs/common';
import { MlClientService } from './ml-client.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [MlClientService],
  exports: [MlClientService],
})
export class MlClientModule {}
