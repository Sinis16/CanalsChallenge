/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE payments ADD COLUMN reference TEXT NOT NULL DEFAULT '';
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE payments DROP COLUMN reference;
  `);
};
