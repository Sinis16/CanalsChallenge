/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE payments DROP CONSTRAINT payments_status_check;
    ALTER TABLE payments ADD CONSTRAINT payments_status_check
      CHECK (status IN ('succeeded', 'declined'));
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE payments DROP CONSTRAINT payments_status_check;
    ALTER TABLE payments ADD CONSTRAINT payments_status_check
      CHECK (status IN ('succeeded', 'failed'));
  `);
};
