import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { clearFailures, isLockedOut, MAX_FAILURES, recordFailure } = await import('./ratelimit');

describe('limite de tentativas de login', () => {
  it('bloqueia após o limite e libera depois de um login correto', async () => {
    const email = 'forca@bruta.com';
    for (let i = 0; i < MAX_FAILURES - 1; i++) await recordFailure(email);
    expect(await isLockedOut(email)).toBe(false);
    await recordFailure(email);
    expect(await isLockedOut(email)).toBe(true);
    expect(await isLockedOut('outro@email.com')).toBe(false); // é por e-mail
    await clearFailures(email);
    expect(await isLockedOut(email)).toBe(false);
  });
});
