import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),
  prefix: 'pde:ratelimit',
  analytics: false,
});
