const express = require('express');
const exphbs = require('express-handlebars');


// get electric prices and sort them
const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';
fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    data.prices.sort((a, b) => a.price - b.price);

    console.log(data.prices);
  });


// 
const now = new Date();
const utcTime = now.toISOString();
console.log(utcTime);