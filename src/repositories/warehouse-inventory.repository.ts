// src/repositories/warehouse-inventory.repository.ts
//
// Data access for warehouse stock.
import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";

export interface OrderItemRequest {
  itemId: string;
  quantity: number;
}

export interface EligibleWarehouse {
  warehouseId: string;
  lat: number;
  lng: number;
}

/**
 * Returns all warehouses that have sufficient stock of EVERY requested
 * item.
 */
export async function findEligibleWarehouses(
  items: OrderItemRequest[],
): Promise<EligibleWarehouse[]> {
  if (items.length === 0) {
    return [];
  }

  // Build "($1::uuid, $2::int), ($3::uuid, $4::int), ..." dynamically
  const valuesClauses: string[] = [];
  const params: (string | number)[] = [];

  items.forEach((item, index) => {
    const itemIdParam = index * 2 + 1;
    const quantityParam = index * 2 + 2;
    valuesClauses.push(`($${itemIdParam}::uuid, $${quantityParam}::int)`);
    params.push(item.itemId, item.quantity);
  });

  const query = `
    SELECT wi.warehouse_id AS "warehouseId", w.lat, w.lng
    FROM warehouse_items wi
    JOIN warehouses w ON w.id = wi.warehouse_id
    JOIN (VALUES ${valuesClauses.join(", ")}) AS requested(item_id, quantity)
      ON wi.item_id = requested.item_id AND wi.quantity >= requested.quantity
    GROUP BY wi.warehouse_id, w.lat, w.lng
    HAVING COUNT(DISTINCT wi.item_id) = $${items.length * 2 + 1};
  `;
  params.push(items.length);

  const result = await pool.query<EligibleWarehouse>(query, params);
  return result.rows;
}

/**
 * Atomically decrements stock for ALL items of an order in a single UPDATE statement.
 */
export async function decrementStockBatch(
  client: PoolClient,
  warehouseId: string,
  items: OrderItemRequest[],
): Promise<Set<string>> {
  const itemIds = items.map((i) => i.itemId);
  const quantities = items.map((i) => i.quantity);

  const result = await client.query<{ item_id: string }>(
    `
    UPDATE warehouse_items wi
    SET quantity = wi.quantity - t.qty
    FROM (
      SELECT unnest($1::uuid[]) AS item_id, unnest($2::int[]) AS qty
    ) AS t
    WHERE wi.warehouse_id = $3
      AND wi.item_id = t.item_id
      AND wi.quantity >= t.qty
    RETURNING wi.item_id;
    `,
    [itemIds, quantities, warehouseId],
  );

  return new Set(result.rows.map((row) => row.item_id));
}

/**
 * The inverse of decrementStockBatch — returns previously reserved
 * stock back to a warehouse.
 */
export async function releaseStockBatch(
  client: PoolClient,
  warehouseId: string,
  items: OrderItemRequest[],
): Promise<void> {
  const itemIds = items.map((i) => i.itemId);
  const quantities = items.map((i) => i.quantity);

  await client.query(
    `
    UPDATE warehouse_items wi
    SET quantity = wi.quantity + t.qty
    FROM (
      SELECT unnest($1::uuid[]) AS item_id, unnest($2::int[]) AS qty
    ) AS t
    WHERE wi.warehouse_id = $3 AND wi.item_id = t.item_id;
    `,
    [itemIds, quantities, warehouseId],
  );
}
