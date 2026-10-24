/** A single durable global bucket bounds total free-tier spend across Worker isolates. */
export async function takeQuota(
  db: D1Database,
  now = Date.now(),
): Promise<boolean> {
  const bucket = Math.floor(now / 60000);
  const result = await db
    .prepare(
      `INSERT INTO ai_quota (key, bucket, count) VALUES ('global-minute', ?, 1)
    ON CONFLICT(key) DO UPDATE SET bucket = excluded.bucket,
    count = CASE WHEN ai_quota.bucket = excluded.bucket THEN ai_quota.count + 1 ELSE 1 END
    WHERE ai_quota.bucket != excluded.bucket OR ai_quota.count < 4 RETURNING count`,
    )
    .bind(bucket)
    .first<{ count: number }>();
  return result !== null;
}
