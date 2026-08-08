import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { MlUser } from './entities/ml-user.entity';
import { MlConnectionStatusDto } from './dto/ml-connection-status.dto';
import { MlConnectionResultDto } from './dto/ml-connection-result.dto';
import { MlStatusResponseDto } from './dto/ml-status-response.dto';
import { ItemsService } from '../items/items.service';
import { MlClientService } from '../ml-client/ml-client.service';
import { MercadoLibreMapper } from './mappers/item-mapper';

const BATCH_SIZE = 20;

/** Máximo que acepta `/items/search`. */
const PAGE_SIZE = 100;

/** Tope de seguridad: 20 000 publicaciones alcanzan y evitan un bucle infinito. */
const MAX_CATALOG_PAGES = 200;

const OAUTH_STATE_TTL_MS = 30 * 60 * 1000;

type MlRawItem = { id: string; message?: string } & Record<string, unknown>;

interface MlMultiGetEntry {
  code: number;
  body: MlRawItem;
}

interface MlMe {
  id: number;
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface MlItemsSearchResponse {
  results?: string[];
  /** Cursor de la paginación por scan; viene vacío cuando no queda nada. */
  scroll_id?: string;
  paging?: { total?: number };
}

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);

  constructor(
    @InjectRepository(MlUser)
    private userRepository: Repository<MlUser>,
    private readonly itemsService: ItemsService,
    private readonly mlClientService: MlClientService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findOneByUserId(userId: string) {
    if (!userId) {
      throw new BadRequestException('userId requerido');
    }
    const mlUser = await this.userRepository.findOneBy({ userId });
    if (!mlUser) {
      throw new NotFoundException(
        'No hay una cuenta de Mercado Libre vinculada a este usuario',
      );
    }
    return mlUser;
  }

  async generateAuthUrl(userId: string): Promise<string> {
    const state = crypto.randomBytes(16).toString('hex');
    await this.cacheManager.set(
      `ml_state_${userId}`,
      state,
      OAUTH_STATE_TTL_MS,
    );
    return `https://auth.mercadolibre.com.uy/authorization?response_type=code&client_id=${process.env.ML_CLIENT_ID}&redirect_uri=${process.env.ML_REDIRECT_URI}&state=${state}`;
  }

  async exchangeCodeForToken(
    code: string,
    state: string,
    userId: string,
  ): Promise<MlConnectionResultDto> {
    const savedState = await this.cacheManager.get(`ml_state_${userId}`);
    if (!savedState || savedState !== state) {
      this.logger.warn(
        `State inválido para el usuario ${userId}: recibido "${state}", esperado "${typeof savedState === 'string' ? savedState : 'ninguno'}"`,
      );
      throw new ForbiddenException(
        'El pedido de vinculación venció o no es válido. Comienza de nuevo desde "Conectar con Mercado Libre".',
      );
    }
    await this.cacheManager.del(`ml_state_${userId}`);

    try {
      const tokens = await this.mlClientService.exchangeCode(code);

      const me = await this.mlClientService.get<MlMe>(
        '/users/me',
        tokens.access_token,
      );

      const mlUser =
        (await this.userRepository.findOneBy({ userId })) ||
        this.userRepository.create({ userId });

      Object.assign(mlUser, {
        mlUserId: me.id.toString(),
        nickname: me.nickname,
        fullName: `${me.first_name} ${me.last_name}`,
        email: me.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        // Volver a vincular es exactamente lo que la marca pedía.
        disconnectedAt: null,
      });

      await this.userRepository.save(mlUser);
      return { success: true, name: me.nickname, email: me.email };
    } catch (err) {
      if (err instanceof HttpException) {
        this.logger.error(
          `Vinculación fallida para el usuario ${userId}: ${err.message}`,
        );
        throw err;
      }
      this.logger.error(
        `Error inesperado vinculando el usuario ${userId}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException(
        'No se pudo completar la vinculación con Mercado Libre',
      );
    }
  }

  async getConnectionStatus(userId: string): Promise<MlStatusResponseDto> {
    let mlUser: MlUser | null;
    try {
      mlUser = await this.resolveActiveAccount(userId);
    } catch {
      // El refresh falló: la cuenta quedó marcada, y devolverla desconectada con
      // la fecha permite avisar en vez de dejar que reviente en la próxima pantalla.
      const caida = await this.userRepository.findOneBy({ userId });
      return {
        connected: false,
        disconnectedAt: caida?.disconnectedAt?.toISOString() ?? null,
      };
    }
    if (!mlUser) return { connected: false };

    return {
      connected: true,
      nickname: mlUser.nickname,
      email: mlUser.email,
      disconnectedAt: null,
    };
  }

  /**
   * La cuenta de ML del usuario con el token ya vigente, o null si no hay ninguna
   * vinculada. Es la dueña de los items y las ventas: todo lo que consulta el
   * usuario se filtra por ella.
   */
  async resolveActiveAccount(userId: string): Promise<MlUser | null> {
    if (!userId) return null;

    const mlUserEntry = await this.userRepository.findOneBy({ userId });
    if (!mlUserEntry) return null;

    const expirationMargin = new Date(Date.now() + 5 * 60000);
    if (mlUserEntry.expiresAt < expirationMargin) {
      await this.executeSilentRefresh(mlUserEntry);
    }

    return mlUserEntry;
  }

  async validateAndRefreshToken(
    userId: string,
  ): Promise<MlConnectionStatusDto> {
    return { status: (await this.resolveActiveAccount(userId)) !== null };
  }

  private async executeSilentRefresh(mlUserEntry: MlUser): Promise<void> {
    try {
      const tokens = await this.mlClientService.refreshToken(
        mlUserEntry.refreshToken,
      );

      mlUserEntry.accessToken = tokens.access_token;
      if (tokens.refresh_token) mlUserEntry.refreshToken = tokens.refresh_token;
      mlUserEntry.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      mlUserEntry.disconnectedAt = null;

      await this.userRepository.save(mlUserEntry);
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(
          `No se pudo refrescar el token de ${mlUserEntry.userId} (nickname ${mlUserEntry.nickname}): ${error.message}`,
        );
        // Queda registrado para no reintentar en cada request y para que la UI
        // pueda avisar antes de que el usuario choque contra un 403.
        await this.userRepository.update(mlUserEntry.id, {
          disconnectedAt: new Date(),
        });
        throw new ForbiddenException(
          'La sesión con Mercado Libre expiró. Vuelve a vincular la cuenta.',
        );
      }
      this.logger.error(
        `Error inesperado refrescando el token de ${mlUserEntry.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Error al refrescar el token de Mercado Libre',
      );
    }
  }

  /**
   * Todas las publicaciones del vendedor.
   *
   * `/items/search` devuelve como máximo 50 por página y **no avisa** cuando hay
   * más: sin paginar, el catálogo dejaba de sincronizarse en silencio al pasar de
   * esa cantidad. Se usa `search_type=scan`, que en vez de offset devuelve un
   * `scroll_id` para pedir la página siguiente — es el único modo que ML soporta
   * más allá de las primeras 1000 publicaciones.
   */
  async fetchSellerItems(userId: string): Promise<string[]> {
    const { accessToken, mlUserId } = await this.findOneByUserId(userId);

    const ids: string[] = [];
    const vistos = new Set<string>();
    let scrollId: string | undefined;

    for (let page = 0; page < MAX_CATALOG_PAGES; page += 1) {
      const cursor = scrollId
        ? `&scroll_id=${encodeURIComponent(scrollId)}`
        : '';
      const response = await this.mlClientService.get<MlItemsSearchResponse>(
        `/users/${mlUserId}/items/search?search_type=scan&limit=${PAGE_SIZE}${cursor}`,
        accessToken,
      );

      const results = response.results ?? [];
      // ML repite el último `scroll_id` cuando se acabó: sin este corte por
      // resultados vacíos, el bucle pediría la misma página hasta el tope.
      if (results.length === 0) break;

      for (const id of results) {
        if (!vistos.has(id)) {
          vistos.add(id);
          ids.push(id);
        }
      }

      scrollId = response.scroll_id;
      if (!scrollId || results.length < PAGE_SIZE) break;

      if (page === MAX_CATALOG_PAGES - 1) {
        this.logger.warn(
          `El catálogo de ${mlUserId} superó las ${MAX_CATALOG_PAGES} páginas: ` +
            `se sincronizaron ${ids.length} publicaciones y puede haber más.`,
        );
      }
    }

    return ids;
  }

  async fetchAndSaveDetailedItems(
    userId: string,
    ids: string[],
  ): Promise<string[]> {
    const { accessToken, id: mlUserId } = await this.findOneByUserId(userId);
    const notSaved: string[] = [];

    for (let index = 0; index < ids.length; index += BATCH_SIZE) {
      const batchIds = ids.slice(index, index + BATCH_SIZE);
      const entries = await this.mlClientService.get<MlMultiGetEntry[]>(
        `/items?ids=${batchIds.join(',')}`,
        accessToken,
      );

      const rawItems: MlRawItem[] = [];
      entries.forEach((entry, position) => {
        const id = entry.body?.id ?? batchIds[position];
        if (entry.code === 200) {
          rawItems.push(entry.body);
          return;
        }
        this.logger.warn(
          `ML devolvió ${entry.code} para la publicación ${id}: ${entry.body?.message ?? 'sin detalle'}`,
        );
        notSaved.push(id);
      });

      try {
        await this.itemsService.upsertMany(
          rawItems.map((rawItem) => MercadoLibreMapper.mapItem(rawItem)),
          mlUserId,
        );
      } catch (error) {
        this.logger.error(
          `Falló el guardado del lote [${batchIds.join(', ')}]`,
          error instanceof Error ? error.stack : String(error),
        );
        throw new InternalServerErrorException(
          `No se pudieron guardar las publicaciones ${batchIds.join(', ')}`,
        );
      }
    }

    return notSaved;
  }
}
