import { describe, test } from 'vitest';

describe('Polling Tools (RMT-06)', () => {
  test.todo('start_pipeline_run returns job_id and writes Redis hash with status pending/running');
  test.todo('start_pipeline_run sets 1hr TTL on Redis key');
  test.todo('check_pipeline_run returns job state from Redis');
  test.todo('check_pipeline_run returns error for non-existent job_id');
});
