const express = require('express');
const exphbs = require('express-handlebars');

const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';

fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    data.prices.sort((a, b) => a.price - b.price);

    console.log(data.prices);
  });