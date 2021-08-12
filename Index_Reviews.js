
const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const db = require('./database.js');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(__dirname + '/../client/dist'));

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

app.get('/reviews', (req, res) => {
  db.getProduct()
  .then((results) => {
    console.log(results);
    res.send(results);
  })
  .catch((err) => {
    res.send(err);
  })

});
