const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://health_user:health_pass@database:5432/health_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    close: () => pool.end()
};
