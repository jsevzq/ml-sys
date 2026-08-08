import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignUpRequestDto } from './dto/signup-request.dto';
import { SignUpResponseDto } from './dto/signup-response.dto';

const BCRYPT_ROUNDS = 12;
const DUMMY_HASH =
  '$2b$12$svg6sOa7GNLEY3fHldmwseLmQd8NhcRte.oKE.zsLMocRdPkh1UPS';
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(loginReq: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOneBy({ email: loginReq.email });
    const matches = await this.verifyPassword(
      loginReq.password,
      user?.password,
    );

    if (!user || !matches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return { access_token: await this.signToken(user) };
  }

  async signUp(signUpReq: SignUpRequestDto): Promise<SignUpResponseDto> {
    const password = await bcrypt.hash(signUpReq.password, BCRYPT_ROUNDS);
    const user = await this.persistUser(signUpReq.email, password);

    return {
      id: user.id,
      email: user.email,
      access_token: await this.signToken(user),
    };
  }

  private async persistUser(email: string, password: string): Promise<User> {
    try {
      return await this.userRepository.save(
        this.userRepository.create({ email, password }),
      );
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      this.logger.error(
        `Error al registrar ${email}`,
        err instanceof Error ? err.stack : err,
      );
      throw new InternalServerErrorException(
        'No se pudo completar el registro',
      );
    }
  }

  private async verifyPassword(plain: string, hash?: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hash ?? DUMMY_HASH);
    } catch (err) {
      this.logger.error(
        'Error al verificar la contraseña',
        err instanceof Error ? err.stack : err,
      );
      return false;
    }
  }

  private signToken(user: User): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, email: user.email });
  }
}
