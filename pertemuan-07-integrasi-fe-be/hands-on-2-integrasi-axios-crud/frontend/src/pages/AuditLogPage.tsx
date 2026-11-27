
import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw, ScrollText } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingPanel,
  Modal,
} from '../components/ui.tsx';
import { auditApi } from '../lib/api.ts';
import { formatAuditAction, formatAuditTarget, formatDate } from '../lib/format.ts';
import { getApiErrorMessage } from '../lib/http.ts';
import type { AuditLog, AuditLogListData } from '../types/api.ts';

export function AuditLogPage() {
  const [result, setResult] = useState<AuditLogListData>({
    items: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  });
  const [targetId, setTargetId] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await auditApi.list({
        page,
        pageSize: 20,
        targetId: targetId ? Number(targetId) : undefined,
        userId: userId ? Number(userId) : undefined,
      });
      setResult(data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, targetId, userId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  async function openDetail(id: number) {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedLog(null);

    try {
      const log = await auditApi.get(id);
      setSelectedLog(log);
    } catch (detailLoadError) {
      setDetailError(getApiErrorMessage(detailLoadError));
    } finally {
      setDetailLoading(false);
    }
  }

  function resetFilters() {
    setTargetId('');
    setUserId('');
    setPage(1);
  }

  let metadata: Record<string, unknown> | null = null;

  if (selectedLog?.metadata) {
    try {
      const parsed: unknown = JSON.parse(selectedLog.metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      metadata = null;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
          <ScrollText className="size-6 text-primary" />
          Audit Log
        </h1>
        <p className="text-sm text-text-muted">
          Riwayat aktivitas dan autentikasi pengguna dalam sistem.
        </p>
      </div>

      <Card className="mb-5 p-4">
        <h2 className="mb-3 text-base font-bold">Filter Audit Log</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target ID" htmlFor="audit-target-id">
            <input
              id="audit-target-id"
              type="number"
              min="1"
              className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm"
              placeholder="Masukkan target ID"
              value={targetId}
              onChange={(event) => {
                setTargetId(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="User ID" htmlFor="audit-user-id">
            <input
              id="audit-user-id"
              type="number"
              min="1"
              className="h-10 w-full rounded-control border border-border bg-surface px-3 text-sm"
              placeholder="Masukkan user ID"
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={resetFilters}>
            Reset Filter
          </Button>
          <Button variant="secondary" onClick={() => void loadLogs()}>
            <RefreshCw className="size-4" />
            Muat Ulang
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      {loading ? (
        <LoadingPanel message="Memuat audit log..." />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Audit log tidak ditemukan"
          message="Tidak ada aktivitas yang sesuai dengan filter."
        />
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Aktivitas</th>
                  <th className="px-4 py-3">Objek</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{log.userName}</p>
                      <p className="text-xs text-text-muted">
                        {log.userEmail || `User #${log.userId}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="primary">
                        {formatAuditAction(log.action)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                      {formatAuditTarget(log.targetTable)} #{log.targetId}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        className="h-8"
                        onClick={() => void openDetail(log.id)}
                      >
                        <Eye className="size-3.5" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Total {result.pagination.total} data · Halaman {result.pagination.page} dari{' '}
              {result.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                disabled={page >= result.pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      {detailLoading ? (
        <Modal title="Detail Audit Log" onClose={() => setDetailLoading(false)}>
          <LoadingPanel message="Memuat detail..." />
        </Modal>
      ) : null}

      {detailError ? (
        <Modal title="Detail Audit Log" onClose={() => setDetailError(null)}>
          <Alert tone="error">{detailError}</Alert>
        </Modal>
      ) : null}

      {selectedLog ? (
        <Modal
          title={`Detail Audit Log #${selectedLog.id}`}
          onClose={() => setSelectedLog(null)}
        >
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Pengguna</p>
              <p className="font-semibold">{selectedLog.userName}</p>
              <p className="text-text-muted">{selectedLog.userEmail}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Aktivitas</p>
              <Badge tone="primary">{formatAuditAction(selectedLog.action)}</Badge>
            </div>
            <div>
              <p className="text-xs text-text-muted">Objek</p>
              <p>
                {formatAuditTarget(selectedLog.targetTable)} #{selectedLog.targetId}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Waktu</p>
              <p>{formatDate(selectedLog.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">IP Address</p>
              <p>{String(metadata?.ip_address ?? '-')}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">User Agent</p>
              <p className="break-all">{String(metadata?.user_agent ?? '-')}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Hasil</p>
              <p>{String(metadata?.result ?? '-')}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Metadata</p>
              <pre className="overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs">
                {selectedLog.metadata || 'Tidak ada metadata'}
              </pre>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
