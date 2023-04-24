// Nordic electric prices
const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';

fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    // Sort the data by price in ascending order
    data.prices.sort((a, b) => a.price - b.price);

    console.log(data);
  });