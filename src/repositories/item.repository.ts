// src/repositories/item.repository.ts
//
// Read-only access to the item catalog. Needed by order.service.ts to
// snapshot the current unit_cost onto each order_item at the moment
// the order is placed.

import { pool } from "../db/pool.js";

export interface Item {
  id: string;
  name: string;
  unitCost: number;
}

//Fetches all requested items in a single query
export async function findItemsByIds(itemIds: string[]): Promise<Item[]> {
  if (itemIds.length === 0) {
    return [];
  }

  const result = await pool.query<Item>(
    `
    SELECT id, name, unit_cost AS "unitCost"
    FROM items
    WHERE id = ANY($1::uuid[]);
    `,
    [itemIds],
  );

  return result.rows;
}
