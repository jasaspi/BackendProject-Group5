const fetch = require('node-fetch');
require('dotenv').config();

/*   Optiot: 
 1. Haetaan seuraavan lähtöhetken lämpötila 
 2. Jos pakkasta, niin laitetaan aina tunniksi sähköt päälle 
 3. Jos pakkasta yli kymmenen astetta, niin kaksi tuntia  */

// const departureTime = require('./index.js'); TODO tämä pitää silputa location urliin

const userLocation = 'Helsinki'; // TODO muuta nämä
const date = '2023-05-01'; // TODO muuta nämä
const hour = 12; // TODO muuta nämä
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

const isFreezeng = 'On pakkasta'; // mitäs näihin
const isMoreFreezing = 'On Pakkasta yli 10C'; // mitäs näihin


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
      console.log(isFreezeng)
      return isFreezeng;
    } else if (temperatureCelsius < -10) {
      console.log(isMoreFreezing);
      return isMoreFreezing;
    }
  } catch (error) {
    console.error(error);
  }
}

getTemperature(location, options);
