const fetch = require('node-fetch');
require('dotenv').config();

/*   Optiot: 
 1. Haetaan seuraavan lähtöhetken lämpötila 
 2. Jos pakkasta, niin laitetaan aina tunniksi sähköt päälle 
 3. Jos pakkasta yli kymmenen astetta, niin kaksi tuntia  */

 let departureTime = require('./index.js'); 
 const location = require('./index.js'); 

  const date = '2023-05-01'; // TODO muuta nämä
  const hour = 12; // TODO muuta nämä

//const userLocation = 'Helsinki'; // TODO muuta nämä
//const location = `https://weatherapi-com.p.rapidapi.com/current.json?q=${encodeURIComponent(userLocation)}&dt=${date}&hour=${hour}`;

const apiKey = process.env.X_RAPIDAPI_KEY;
const apiHost = process.env.X_RAPIDAPI_HOST;

const options = {
  method: 'GET',
  headers: {
    'content-type': 'application/json',
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': apiHost
  }
};



const getTemperature = async (location, options) => {
  try {
    const locationUrl = `https://weatherapi-com.p.rapidapi.com/current.json?q=${encodeURIComponent(location)}`;
    const response = await fetch(locationUrl, options);
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    const result = await response.json();
    const temperatureCelsius = result.current.temp_c + " °C";
   // const temperatureCelsius = -9;
    console.log(temperatureCelsius);
    if (temperatureCelsius < 0 && temperatureCelsius >= -10) {
      return 'Pakkasta on '+ temperatureCelsius +' sähköt laitetaan päälle tuntia aijemmin.';
    } else if (temperatureCelsius < -10) {
      return 'Pakkasta on '+ temperatureCelsius + ' sähköt laitetaan päälle kaksi tuntia aijemmin.';
    } else {
      return temperatureCelsius;
    }
  } catch (error) {
    console.error(error);
  }}


console.log(typeof departureTime);

getTemperature(location, options);


module.exports = {
  getTemperature: getTemperature,
  options: options
};
