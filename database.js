const { Client } = require('pg');
const {dbInfo} = require('./config.js');
const dbClient = new Client(dbInfo);
const fs = require('fs');

dbClient.connect()
.then(() => console.log('Connected to Postgres Database!'))
.catch((err) => console.error(err, 'Error connecting to Postgres :('))
// .finally(() => dbClient.end())

const getProduct = function() {
  return dbClient.query('SELECT * FROM reviews where id = 1')
}

module.exports = {
  dbClient: dbClient,
  getProduct: getProduct
}




// module.exports = {
//   connection: connection,
// }