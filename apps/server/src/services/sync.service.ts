import { db } from '../db/database';
import {
  SyncPushBatchRequest,
  SyncPushBatchResponse,
  SyncItemResult,
  HlcTimestamp,
  SyncPullResponse,
} from '@fitlife/shared-types';

export class SyncService {
  /**
   * Generates monotonic server HLC timestamp.
   */
  static generateServerHlc(clientHlc: HlcTimestamp): HlcTimestamp {
    const serverPhysical = Date.now();
    const physicalTimeMs = Math.max(serverPhysical, clientHlc.physicalTimeMs);
    const logicalCounter =
      physicalTimeMs === clientHlc.physicalTimeMs ? clientHlc.logicalCounter + 1 : 0;
    return { physicalTimeMs, logicalCounter };
  }

  /**
   * Processes an incoming batch of mutations with effectively-once processing semantics.
   */
  static async processBatch(
    userId: string,
    request: SyncPushBatchRequest
  ): Promise<SyncPushBatchResponse> {
    const { batchId, clientHlc, mutations } = request;

    // 1. Idempotency Check: if batch was already processed, return cached receipt
    const existing = await db
      .selectFrom('idempotency_ledger')
      .where('batch_id', '=', batchId)
      .where('user_id', '=', userId)
      .select(['response_payload'])
      .executeTakeFirst();

    if (existing) {
      const payload = typeof existing.response_payload === 'string' 
        ? JSON.parse(existing.response_payload) 
        : existing.response_payload;
      return payload as SyncPushBatchResponse;
    }

    const serverHlc = this.generateServerHlc(clientHlc);
    const results: SyncItemResult[] = [];

    // 2. Process mutations in transaction
    await db.transaction().execute(async (trx) => {
      for (const m of mutations) {
        try {
          const clientTimestamp = m.hlc.physicalTimeMs;
          const serverTimestamp = serverHlc.physicalTimeMs;

          // Record mutation into sync_records audit log
          await trx
            .insertInto('sync_records')
            .values({
              user_id: userId,
              entity_type: m.entityType,
              entity_id: m.entityId,
              operation: m.operation,
              client_timestamp: clientTimestamp,
              server_timestamp: serverTimestamp,
              payload: JSON.stringify(m.payload) as any,
            })
            .execute();

          // Apply entity mutations according to conflict resolution strategy
          if (m.entityType === 'workout_sessions') {
            const p = m.payload as any;
            if (m.operation === 'INSERT' || m.operation === 'UPDATE') {
              await trx
                .insertInto('workout_sessions')
                .values({
                  id: m.entityId,
                  user_id: userId,
                  title: p.title ?? 'Workout',
                  started_at: new Date(p.startedAt ?? Date.now()),
                  ended_at: p.endedAt ? new Date(p.endedAt) : null,
                  notes: p.notes ?? null,
                  client_created_at: new Date(p.clientCreatedAt ?? Date.now()),
                  client_updated_at: new Date(p.clientUpdatedAt ?? Date.now()),
                  is_deleted: Boolean(p.isDeleted),
                })
                .onConflict((oc) =>
                  oc.column('id').doUpdateSet({
                    title: p.title,
                    ended_at: p.endedAt ? new Date(p.endedAt) : null,
                    notes: p.notes ?? null,
                    client_updated_at: new Date(p.clientUpdatedAt ?? Date.now()),
                    is_deleted: Boolean(p.isDeleted),
                  })
                )
                .execute();
            } else if (m.operation === 'DELETE') {
              await trx
                .updateTable('workout_sessions')
                .set({ is_deleted: true })
                .where('id', '=', m.entityId)
                .where('user_id', '=', userId)
                .execute();
            }
          } else if (m.entityType === 'workout_sets') {
            const p = m.payload as any;
            if (m.operation === 'INSERT' || m.operation === 'UPDATE') {
              await trx
                .insertInto('workout_sets')
                .values({
                  id: m.entityId,
                  workout_session_id: p.workoutSessionId,
                  exercise_id: p.exerciseId,
                  set_index: p.setIndex ?? 0,
                  set_type: p.setType ?? 'standard',
                  weight_kg: p.weightKg ?? 0,
                  reps: p.reps ?? 1,
                  rpe: p.rpe ?? null,
                  is_completed: p.isCompleted !== false,
                })
                .onConflict((oc) =>
                  oc.column('id').doUpdateSet({
                    weight_kg: p.weightKg,
                    reps: p.reps,
                    rpe: p.rpe,
                    is_completed: p.isCompleted !== false,
                  })
                )
                .execute();
            }
          } else if (m.entityType === 'hydration_logs') {
            const p = m.payload as any;
            if (m.operation === 'INSERT') {
              await trx
                .insertInto('hydration_logs')
                .values({
                  id: m.entityId,
                  user_id: userId,
                  logged_at: new Date(p.loggedAt ?? Date.now()),
                  amount_ml: p.amountMl ?? 250,
                  client_created_at: new Date(p.clientCreatedAt ?? Date.now()),
                  is_deleted: false,
                })
                .onConflict((oc) => oc.column('id').doNothing())
                .execute();
            } else if (m.operation === 'DELETE') {
              await trx
                .updateTable('hydration_logs')
                .set({ is_deleted: true })
                .where('id', '=', m.entityId)
                .where('user_id', '=', userId)
                .execute();
            }
          } else if (m.entityType === 'habits') {
            const p = m.payload as any;
            if (m.operation === 'INSERT' || m.operation === 'UPDATE') {
              await trx
                .insertInto('habits')
                .values({
                  id: m.entityId,
                  user_id: userId,
                  title: p.title ?? 'Habit',
                  icon: p.icon ?? 'check',
                  target_frequency: p.targetFrequency ?? 'daily',
                  days_of_week: p.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7],
                  is_archived: Boolean(p.isArchived),
                })
                .onConflict((oc) =>
                  oc.column('id').doUpdateSet({
                    title: p.title,
                    icon: p.icon,
                    target_frequency: p.targetFrequency,
                    days_of_week: p.daysOfWeek,
                    is_archived: p.isArchived,
                  })
                )
                .execute();
            }
          }

          results.push({
            clientQueueId: m.clientQueueId,
            status: 'COMMITTED',
          });
        } catch (err: any) {
          results.push({
            clientQueueId: m.clientQueueId,
            status: 'REJECTED_VALIDATION',
            error: err.message ?? 'Failed to apply mutation',
          });
        }
      }

      const responsePayload: SyncPushBatchResponse = {
        batchId,
        serverHlc,
        results,
      };

      // 3. Cache response in idempotency ledger for 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await trx
        .insertInto('idempotency_ledger')
        .values({
          batch_id: batchId,
          user_id: userId,
          status: 'COMMITTED',
          response_payload: JSON.stringify(responsePayload) as any,
          expires_at: expiresAt,
        })
        .onConflict((oc) =>
          oc.column('batch_id').doUpdateSet({
            status: 'COMMITTED',
            response_payload: JSON.stringify(responsePayload) as any,
            expires_at: expiresAt,
          })
        )
        .execute();
    });

    return {
      batchId,
      serverHlc,
      results,
    };
  }

  static async pullChanges(userId: string, sinceTimestamp: number): Promise<SyncPullResponse> {
    const records = await db
      .selectFrom('sync_records')
      .where('user_id', '=', userId)
      .where('server_timestamp', '>', sinceTimestamp)
      .orderBy('server_timestamp', 'asc')
      .selectAll()
      .execute();

    const serverPhysical = Date.now();
    const serverHlc: HlcTimestamp = { physicalTimeMs: serverPhysical, logicalCounter: 0 };

    return {
      serverHlc,
      records: records.map((r) => ({
        entityType: r.entity_type as any,
        entityId: r.entity_id,
        operation: r.operation as any,
        payload: r.payload,
        serverTimestamp: Number(r.server_timestamp),
      })),
    };
  }
}
