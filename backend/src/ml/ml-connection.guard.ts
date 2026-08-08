import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { MlService } from './ml.service';
import { Reflector } from '@nestjs/core';
import { MlUser } from './entities/ml-user.entity';
import type { AuthenticatedRequest } from '../auth/auth.guard';

/** Request de una ruta que ya pasó por el guard: la cuenta dueña está resuelta. */
export interface MlRequest extends AuthenticatedRequest {
  mlAccount: MlUser;
}

@Injectable()
export class MlConnectionGuard implements CanActivate {
  constructor(
    private readonly mlService: MlService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipMlConnection = this.reflector.getAllAndOverride<boolean>(
      ML_CONNECTION,
      [context.getHandler(), context.getClass()],
    );

    if (skipMlConnection) {
      return true;
    }

    const request = context.switchToHttp().getRequest<MlRequest>();
    const mlAccount = await this.mlService.resolveActiveAccount(
      String(request.user.sub),
    );

    if (!mlAccount) {
      throw new ForbiddenException(
        'No hay una cuenta de Mercado Libre vinculada. Vincule una cuenta para usar esta sección.',
      );
    }

    request.mlAccount = mlAccount;
    return true;
  }
}

export const ML_CONNECTION = 'mlConnection';
export const SkipMlConnection = () => SetMetadata(ML_CONNECTION, true);
