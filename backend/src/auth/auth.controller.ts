import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { Public } from './auth.guard';
import { SignUpRequestDto } from './dto/signup-request.dto';
import { SkipMlConnection } from '../ml/ml-connection.guard';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignUpResponseDto } from './dto/signup-response.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipMlConnection()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  @Post('login')
  async signIn(@Body() loginReq: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.signIn(loginReq);
  }

  @Public()
  @SkipMlConnection()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SignUpResponseDto })
  @Post('register')
  async signUp(
    @Body() signUpReq: SignUpRequestDto,
  ): Promise<SignUpResponseDto> {
    return this.authService.signUp(signUpReq);
  }
}
