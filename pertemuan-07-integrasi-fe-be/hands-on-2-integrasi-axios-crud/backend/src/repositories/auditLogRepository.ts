
import sql from 'mssql';
import { createRequest } from '../db/request.ts';

export interface AuditLogRow {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  action: string;
  targetTable: string;
  targetId: number;
  metadata: string | null;
  createdAt: Date | null;
}

export interface CreateAuditLogInput {
  userId: number;
  action: string;
  targetTable: string;
  targetId: number;
  metadata?: unknown;
}

export interface FindAuditLogsParams {
  page?: number;
  pageSize?: number;
  action?: string;
  targetTable?: string;
  targetId?: number;
  userId?: number;
  from?: string;
  to?: string;
}

export interface FindAuditLogsResult {
  items: AuditLogRow[];
  total: number;
}

const auditSelect = `
  SELECT
    a.id,
    a.user_id AS userId,
    u.name AS userName,
    u.email AS userEmail,
    a.action,
    a.target_table AS targetTable,
    a.target_id AS targetId,
    a.metadata,
    a.created_at AS createdAt
  FROM dbo.AUDIT_LOGS a
  INNER JOIN dbo.USERS u ON u.id = a.user_id
`;

const whereClause = `
  WHERE (@action IS NULL OR a.action = @action)
    AND (@targetTable IS NULL OR a.target_table = @targetTable)
    AND (@targetId IS NULL OR a.target_id = @targetId)
    AND (@userId IS NULL OR a.user_id = @userId)
    AND (@fromDate IS NULL OR a.created_at >= @fromDate)
    AND (
      @toDate IS NULL
      OR a.created_at < DATEADD(day, 1, @toDate)
    )
`;

function applyFilters(
  request: sql.Request,
  params: FindAuditLogsParams,
): sql.Request {
  return request
    .input('action', sql.NVarChar(50), params.action ?? null)
    .input('targetTable', sql.NVarChar(50), params.targetTable ?? null)
    .input('targetId', sql.Int, params.targetId ?? null)
    .input('userId', sql.Int, params.userId ?? null)
    .input(
      'fromDate',
      sql.Date,
      params.from ? new Date(`${params.from}T00:00:00.000Z`) : null,
    )
    .input(
      'toDate',
      sql.Date,
      params.to ? new Date(`${params.to}T00:00:00.000Z`) : null,
    );
}

export class AuditLogRepository {
  async create(
    input: CreateAuditLogInput,
    transaction?: sql.Transaction,
  ): Promise<void> {
    const request = await createRequest(transaction);

    const metadata =
      input.metadata === undefined ? null : JSON.stringify(input.metadata);

    await request
      .input('userId', sql.Int, input.userId)
      .input('action', sql.NVarChar(50), input.action)
      .input('targetTable', sql.NVarChar(50), input.targetTable)
      .input('targetId', sql.Int, input.targetId)
      .input('metadata', sql.NVarChar(sql.MAX), metadata)
      .query(`
        INSERT INTO dbo.AUDIT_LOGS
          (user_id, action, target_table, target_id, metadata)
        VALUES
          (@userId, @action, @targetTable, @targetId, @metadata)
      `);
  }

  async findAll(
    params: FindAuditLogsParams = {},
  ): Promise<FindAuditLogsResult> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Request khusus mengambil data.
    const itemsRequest = applyFilters(
      await createRequest(),
      params,
    );

    const itemsResult = await itemsRequest
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .query<AuditLogRow>(`
        ${auditSelect}
        ${whereClause}
        ORDER BY a.created_at DESC, a.id DESC
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `);

    // Request terpisah untuk menghitung total.
    const countRequest = applyFilters(
      await createRequest(),
      params,
    );

    const countResult = await countRequest.query<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM dbo.AUDIT_LOGS a
      ${whereClause}
    `);

    return {
      items: itemsResult.recordset,
      total: countResult.recordset[0]?.total ?? 0,
    };
  }

  async findById(id: number): Promise<AuditLogRow | null> {
    const request = await createRequest();

    const result = await request
      .input('id', sql.Int, id)
      .query<AuditLogRow>(`
        ${auditSelect}
        WHERE a.id = @id
      `);

    return result.recordset[0] ?? null;
  }
}
