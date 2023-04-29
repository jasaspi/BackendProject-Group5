const fetch = require('node-fetch');
require('dotenv').config();

/*   Optiot: 
 1. Haetaan seuraavan lähtöhetken lämpötila 
 2. Jos pakkasta, niin laitetaan aina tunniksi sähköt päälle 
 3. Jos pakkasta yli kymmenen astetta, niin kaksi tuntia  */

 const departureTime = require('./index.js'); 
 //2023-04-29T13:50:50.277Z
 const date = departureTime.toISOString().slice(0, 10);
 //console.log(date);
 const hour = departureTime.getUTCHours();
 //console.log(hour);

const userLocation = 'Helsinki'; // TODO muuta nämä
const location = `https://weatherapi-com.p.rapidapi.com/current.json?q=${encodeURIComponent(userLocation)}&dt=${date}&hour=${hour}`;

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

const isFreezeng = 'On pakkasta, sähkö laitetaan päälle tuntia aijemmin.'; // mitäs näihin
const isMoreFreezing = 'On Pakkasta yli 10C, sähkö laitetaan päälle kaksi tuntia aijemmin.'; // mitäs näihin


const getTemperature = async (location, options) => {
  try {
    const response = await fetch(location, options);
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    const result = await response.json();
    const temperatureCelsius = result.current.temp_c; //seulotaan pelkkä lämpötila
    //const temperatureCelsius = -10;
    //return temperatureCelsius;
    console.log(temperatureCelsius);
    if (temperatureCelsius < 0 && temperatureCelsius >= -10) {
      //console.log(isFreezeng)
      return isFreezeng;
    } else if (temperatureCelsius < -10) {
      //console.log(isMoreFreezing);
      return isMoreFreezing;
    }
  } catch (error) {
    console.error(error);
  }
}

getTemperature(location, options);
