// get electric prices and sort them
const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';
fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    const departureTime = Date.now(); // replace this time with departure time
    data.prices.sort((a, b) => a.endDate - b.endDate); // check last known time for price - data.prices[0]

    const twelveHoursAgo = new Date(departureTime - 10 * 60 * 60 * 1000).toISOString();
    const filteredData = data.prices.filter(item => item.startDate >= twelveHoursAgo && new Date(item.endDate) <= departureTime);
    const sortedData = filteredData.sort((a, b) => a.price - b.price);
    const cheapestSix = sortedData.slice(0, 6); //replace second parameter with total hours to charge

    console.log(cheapestSix);
    console.log(data.prices[0]);
  });


  
// Get current time in UTC
const now = new Date();
const utcTime = now.toISOString();
console.log(utcTime);