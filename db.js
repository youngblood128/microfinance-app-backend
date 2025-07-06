// db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root', // or your username
  password: '', // type your MySQL password if you set one
  database: 'fin_app_db',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = db;
