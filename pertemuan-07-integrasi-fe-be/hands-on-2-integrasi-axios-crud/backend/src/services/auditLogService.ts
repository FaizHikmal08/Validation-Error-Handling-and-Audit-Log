
import sql from 'mssql';
import type { AuditLogDto } from '../dtos/auditDto.ts';
import type { AuditQuery } from '../schemas/auditSchema.ts';
import { NotFoundError } from '../errors/NotFoundError.ts';
import {
  AuditLogRepository,
  type AuditLogRow,
  type CreateAuditLogInput,
} from '../repositories/auditLogRepository.ts';

export class AuditLogService {
  private auditLogRepository: AuditLogRepository;

  constructor(
    auditLogRepository: AuditLogRepository = new AuditLogRepository(),
  ) {
    this.auditLogRepository = auditLogRepository;
  }

  private toDto(row: AuditLogRow): AuditLogDto {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      action: row.action,
      targetTable: row.targetTable,
      targetId: row.targetId,
      metadata: row.metadata,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    };
  }

  async record(
    input: CreateAuditLogInput,
    transaction?: sql.Transaction,
  ): Promise<void> {
    await this.auditLogRepository.create(input, transaction);
  }

  async list(params: AuditQuery) {
    const result = await this.auditLogRepository.findAll(params);

    return {
      items: result.items.map((row) => this.toDto(row)),
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total: result.total,
        totalPages: Math.ceil(
          result.total / (params.pageSize ?? 20),
        ),
      },
    };
  }

  async detail(id: number): Promise<AuditLogDto> {
    const row = await this.auditLogRepository.findById(id);

    if (!row) {
      throw new NotFoundError('Audit log tidak ditemukan');
    }

    return this.toDto(row);
  }
}
