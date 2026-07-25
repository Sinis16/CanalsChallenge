import { pool } from "./pool.js";
// Poblacion inicial de la base de datos para pruebas y desarrollo
async function seed() {
  const client = await pool.connect();

  try {
    console.log("Seeding database");

    //Customers
    const customersResult = await client.query(`
      INSERT INTO customers (name) VALUES
        ('Juan Perez'),
        ('Maria Martinez')
      RETURNING id, name;
    `);
    const [customer1, customer2] = customersResult.rows;
    console.log("Customers created:", customersResult.rows);

    //Items
    const itemsResult = await client.query(`
      INSERT INTO items (name, unit_cost) VALUES
        ('Laptop', 3500000),
        ('Mouse', 80000),
        ('Keyboard', 150000),
        ('Monitor', 900000)
      RETURNING id, name;
    `);
    const [laptop, mouse, keyboard, monitor] = itemsResult.rows;
    console.log("Items created:", itemsResult.rows);

    //Warehouses
    const warehousesResult = await client.query(`
      INSERT INTO warehouses (name, lat, lng) VALUES
        ('Bodega Bogota', 4.7110, -74.0721),
        ('Bodega Medellin', 6.2442, -75.5812),
        ('Bodega Cali', 3.4516, -76.5320)
      RETURNING id, name;
    `);
    const [warehouseBogota, warehouseMedellin, warehouseCali] =
      warehousesResult.rows;
    console.log("Warehouses created:", warehousesResult.rows);

    // Warehouse Items
    // Scenario design:
    // - Bogota: has full stock of everything
    // - Medellin: also has full stock of everything
    // - Cali: missing stock of Monitor
    await client.query(
      `
      INSERT INTO warehouse_items (warehouse_id, item_id, quantity) VALUES
        ($1, $2, 10), ($1, $3, 20), ($1, $4, 15), ($1, $5, 8),
        ($6, $2, 10), ($6, $3, 20), ($6, $4, 15), ($6, $5, 8),
        ($7, $2, 5),  ($7, $3, 10), ($7, $4, 10), ($7, $5, 0);
      `,
      [
        warehouseBogota.id,
        laptop.id,
        mouse.id,
        keyboard.id,
        monitor.id,
        warehouseMedellin.id,
        warehouseCali.id,
      ],
    );
    console.log("Warehouse stock created.");

    console.log("\nSeed complete. Reference IDs for manual testing:");
    console.log({
      customers: { customer1, customer2 },
      items: { laptop, mouse, keyboard, monitor },
      warehouses: { warehouseBogota, warehouseMedellin, warehouseCali },
    });
  } catch (err) {
    console.error("Seed failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
