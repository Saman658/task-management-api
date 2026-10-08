import { Pool } from 'pg';
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'task_management_db',
    password: 'Sehrish',
    port: 5432
});

export default pool;