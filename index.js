const express = require('express');
const exphbs = require('express-handlebars');
const fetch = require('node-fetch');

const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';

app.engine('handlebars', exphbs.engine({
  defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');

fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    data.prices.sort((a, b) => a.price - b.price);

    console.log(data.prices);
  });