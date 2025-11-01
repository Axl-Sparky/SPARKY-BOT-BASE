const { Sequelize, DataTypes } = require('sequelize');

const X = require("../config")
const database = new Sequelize(X.DATABASE_URL, {
 dialectOptions: {
  ssl: {
   require: true,
   rejectUnauthorized: false
  } 
 }, logging: false 
});

try {
 database.authenticate();
} catch {
 console.log('[ ! ] Cannot authenticate with database.');
 console.log('Make sure you have provided a valid DATABASE_URL as environment variable.');
}
try {
 database.sync();
} catch {
 console.log('[ ! ] Cannot sync database.');
}

module.exports = { database };
