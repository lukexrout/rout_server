const Pool = require('pg/lib').Pool

const pool = new Pool({
    user: 'rout_admin',
    password: 'rout_admin',
    host: '',
    port: 5432,
    database: 'rout_data'
    // connectionString: process.env.DATABASE_URL,
    // ssl: {
    //     rejectUnauthorized: false
    // }
})

module.exports = pool

// \l == list all database
// \c <database> == to pick a database
// \dt == list all tables in that database
// CREATE TABLE <table_name> (id INT SERIAL PRIMARY KEY, ..., ..., ...)
// SELECT * FORM ... == Look at data in row
// DELETE FROM users WHERE email='bro@email.com' == Delete certain insert
// ALTER SEQUENCE users_id_seq RESTART WITH 1 == Restarts primary key sequence
// ALTER TABLE customers ADD COLUMN date DATE DEFAULT NOW();
// psql --host=ec2-54-91-188-254.compute-1.amazonaws.com --port=5432 --username=yuxvtigeucsotu --password=96b9aefa24d5b6b995e4694ca18f516fa5802b5e9156dbea5fa8c9cc6d5b6967 --dbname=d4vfnun7287llt 
