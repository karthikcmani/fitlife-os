import { getLocalDatabase } from '../db/sqlite';
import {
  SyncEntityType,
  SyncOperation,
  HlcTimestamp,
  SyncPushBatchRequest,
  SyncPushBatchResponse,
} from '../types';

export class SyncManager {
  private static logicalCounter = 0;
  private static lastPhysicalTime = 0;

  /**
   * Generates a monotonic Hybrid Logical Clock timestamp.
   */
  static getHlc(): HlcTimestamp {
    const now = Date.now();
    if (now > this.lastPhysicalTime) {
      this.lastPhysicalTime = now;
      this.logicalCounter = 0;
    } else {
      this.logicalCounter += 1;
    }
    return {
      physicalTimeMs: this.lastPhysicalTime,
      logicalCounter: this.logicalCounter,
    };
  }

  /**
   * Enqueues a local mutation to be synchronized to the backend.
   */
  static async enqueueMutation(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>
  ): Promise<void> {
    const db = await getLocalDatabase();
    await db.runAsync(
      `INSERT INTO sync_queue (entity_type, entity_id, operation, payload, created_at, attempt_count)
       VALUES (?, ?, ?, ?, ?, 0);`,
      [entityType, entityId, operation, JSON.stringify(payload), Date.now()]
    );
  }

  /**
   * Pushes pending queued mutations to backend.
   */
  static async pushPendingMutations(
    backendUrl: string,
    accessToken: string
  ): Promise<{ success: boolean; committedCount: number; errors: string[] }> {
    const db = await getLocalDatabase();

    const queued = await db.getAllAsync<{
      queue_id: number;
      entity_type: SyncEntityType;
      entity_id: string;
      operation: SyncOperation;
      payload: string;
    }>(`SELECT queue_id, entity_type, entity_id, operation, payload FROM sync_queue ORDER BY queue_id ASC LIMIT 50;`);

    if (queued.length === 0) {
      return { success: true, committedCount: 0, errors: [] };
    }

    const mutations = queued.map((q) => ({
      clientQueueId: q.queue_id,
      entityType: q.entity_type,
      entityId: q.entity_id,
      operation: q.operation,
      payload: JSON.parse(q.payload),
      hlc: this.getHlc(),
    }));

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const requestPayload: SyncPushBatchRequest = {
      batchId,
      clientHlc: this.getHlc(),
      mutations,
    };

    try {
      const response = await fetch(`${backendUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`Sync push HTTP error: ${response.status}`);
      }

      const receipt: SyncPushBatchResponse = await response.json();
      const committedIds: number[] = [];
      const errors: string[] = [];

      for (const res of receipt.results) {
        if (res.status === 'COMMITTED') {
          committedIds.push(res.clientQueueId);
        } else {
          errors.push(`Queue ID ${res.clientQueueId}: ${res.error ?? res.status}`);
        }
      }

      // Purge committed mutations from queue
      if (committedIds.length > 0) {
        const placeholders = committedIds.map(() => '?').join(',');
        await db.runAsync(
          `DELETE FROM sync_queue WHERE queue_id IN (${placeholders});`,
          committedIds
        );
      }

      return {
        success: true,
        committedCount: committedIds.length,
        errors,
      };
    } catch (err: any) {
      // Increment attempt count on failure
      const ids = queued.map((q) => q.queue_id);
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE sync_queue SET attempt_count = attempt_count + 1, last_error = ? WHERE queue_id IN (${placeholders});`,
        [err.message, ...ids]
      );

      return {
        success: false,
        committedCount: 0,
        errors: [err.message],
      };
    }
  }

  /**
   * Returns current count of un-synced offline records.
   */
  static async getPendingCount(): Promise<number> {
    const db = await getLocalDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue;`
    );
    return result?.count ?? 0;
  }
}
