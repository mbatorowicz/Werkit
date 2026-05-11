/**
 * Porównywanie i hash hasła: domyślnie natywny `bcrypt`.
 * `WERKIT_USE_BCRYPTJS=1` — wymuszenie pure-JS (`bcryptjs`), np. problematyczny runtime bez native addon.
 * Jeśli import `bcrypt` rzuci przy starcie modułu (rzadkie), próba automatycznego fallbacku do `bcryptjs`.
 */
type Impl = {
  compare: (plain: string, hash: string) => Promise<boolean>;
  hash: (plain: string, rounds: number) => Promise<string>;
};

async function loadImpl(): Promise<Impl> {
  if (process.env.WERKIT_USE_BCRYPTJS === '1') {
    const bcryptjs = await import('bcryptjs');
    return {
      compare: (plain, hash) => Promise.resolve(bcryptjs.compare(plain, hash)),
      hash: (plain, rounds) => Promise.resolve(bcryptjs.hash(plain, rounds)),
    };
  }
  try {
    const bcrypt = await import('bcrypt');
    return {
      compare: (plain, hash) => bcrypt.compare(plain, hash),
      hash: (plain, rounds) => bcrypt.hash(plain, rounds),
    };
  } catch {
    const bcryptjs = await import('bcryptjs');
    return {
      compare: (plain, hash) => Promise.resolve(bcryptjs.compare(plain, hash)),
      hash: (plain, rounds) => Promise.resolve(bcryptjs.hash(plain, rounds)),
    };
  }
}

let implPromise: Promise<Impl> | null = null;

function getImpl(): Promise<Impl> {
  if (!implPromise) implPromise = loadImpl();
  return implPromise;
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return (await getImpl()).compare(plain, hash);
}

export async function hashPassword(plain: string, rounds = 10): Promise<string> {
  return (await getImpl()).hash(plain, rounds);
}
