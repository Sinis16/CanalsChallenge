/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
    );

    CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0)
    );

    CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    shipping_address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE order_items (
    order_id UUID NOT NULL REFERENCES orders(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, item_id)
    );

    CREATE TABLE warehouse_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    item_id UUID NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    UNIQUE (warehouse_id, item_id)
    );

    CREATE INDEX idx_warehouse_items_item_id ON warehouse_items(item_id);

    CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_warehouse_items_item_id ON warehouse_items(item_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(
    `DROP TABLE IF EXISTS payments, order_items, orders, warehouse_items, warehouses, items, customers CASCADE;`,
  );
};
