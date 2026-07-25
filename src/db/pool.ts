import { Pool } from "pg";
// Grupo de conexiones abiertas y reutilizables a la base de datos
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
