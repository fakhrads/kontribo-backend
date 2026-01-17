import { db } from "@/db";

export async function tx<T>(fn: (trx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (trx) => fn(trx as any));
}
