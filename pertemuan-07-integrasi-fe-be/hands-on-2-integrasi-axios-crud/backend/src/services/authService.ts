
import bcrypt from 'bcryptjs';
import { env } from '../config/env.ts';
import { ConflictError } from '../errors/ConflictError.ts';
import { UnauthorizedError } from '../errors/UnauthorizedError.ts';
import type { UserDto } from '../dtos/userDto.ts';
import { UserRepository, type UserRow } from '../repositories/userRepository.ts';
import type { LoginInput, RegisterInput } from '../schemas/authSchema.ts';
import { AuditLogService } from './auditLogService.ts';
import { signToken } from './tokenService.ts';

interface AuthAuditInfo {
  ipAddress: string | null;
  userAgent: string | null;
}

export class AuthService {
  private userRepository: UserRepository;
  private auditLogService: AuditLogService;

  constructor(
    userRepository: UserRepository = new UserRepository(),
    auditLogService: AuditLogService = new AuditLogService(),
  ) {
    this.userRepository = userRepository;
    this.auditLogService = auditLogService;
  }

  private toDto(row: UserRow): UserDto {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    };
  }

  private async recordAuthAudit(
    userId: number,
    action: 'LOGIN' | 'LOGOUT',
    result: 'SUCCESS' | 'FAILED',
    info: AuthAuditInfo,
  ): Promise<void> {
    try {
      await this.auditLogService.record({
        userId,
        action,
        targetTable: 'USERS',
        targetId: userId,
        metadata: {
          ip_address: info.ipAddress,
          user_agent: info.userAgent,
          result,
        },
      });
    } catch (error) {
      // Kegagalan audit tidak boleh menggagalkan autentikasi.
      console.error('Gagal menyimpan audit autentikasi:', error);
    }
  }

  async register(input: RegisterInput): Promise<UserDto> {
    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      throw new ConflictError('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      env.bcryptSaltRounds,
    );

    const row = await this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'customer',
    });

    if (!row) {
      throw new ConflictError('User gagal dibuat');
    }

    await this.auditLogService.record({
      userId: row.id,
      action: 'REGISTER_CUSTOMER',
      targetTable: 'USERS',
      targetId: row.id,
    });

    return this.toDto(row);
  }

  async login(
    input: LoginInput,
    auditInfo: AuthAuditInfo = {
      ipAddress: null,
      userAgent: null,
    },
  ): Promise<{ user: UserDto; token: string }> {
    const row = await this.userRepository.findByEmail(input.email);

    if (!row) {
      // Tidak dapat mencatat user yang tidak ditemukan karena
      // kolom AUDIT_LOGS.user_id wajib memiliki user yang valid.
      throw new UnauthorizedError('Email atau password salah');
    }

    let passwordValid = false;

    try {
      passwordValid = await bcrypt.compare(
        input.password,
        row.passwordHash,
      );
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      await this.recordAuthAudit(
        row.id,
        'LOGIN',
        'FAILED',
        auditInfo,
      );

      throw new UnauthorizedError('Email atau password salah');
    }

    const user = this.toDto(row);

    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await this.recordAuthAudit(
      user.id,
      'LOGIN',
      'SUCCESS',
      auditInfo,
    );

    return { user, token };
  }

  async recordLogout(
    userId: number,
    auditInfo: AuthAuditInfo,
  ): Promise<void> {
    await this.recordAuthAudit(
      userId,
      'LOGOUT',
      'SUCCESS',
      auditInfo,
    );
  }

  async me(userId: number): Promise<UserDto> {
    const row = await this.userRepository.findById(userId);

    if (!row) {
      throw new UnauthorizedError();
    }

    return this.toDto(row);
  }
}
