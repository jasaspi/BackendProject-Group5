const express = require('express');
const exphbs = require('express-handlebars');
const fetch = require('node-fetch');

// Jonna added ones below to make mongo + user auth working
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose'); // Vai tarviiko tähän scriptiin
require('dotenv').config();
const User = require('./models/User');
const app = express();
const dbURI = 'mongodb+srv://'+ process.env.DBUSER +':'+ process.env.DBPASSWD +''+ process.env.CLUSTER +'.mongodb.net/'+ process.env.DB +'?retryWrites=true&w=majority'
 
mongoose.connect(dbURI); 

app.use(require("express-session")({
    secret: "Rusty is a dog",
    resave: false,
    saveUninitialized: false
}));
app.use(express.json()) // parse json bodies
app.use(express.urlencoded({extended: false}));
app.use(express.static('public'));

// Passport initials
app.use(passport.initialize());
app.use(passport.session());
  
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Jonna's add ones end here

app.engine('handlebars', exphbs.engine({
  defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');

// Routes and functions added by Jonna

//Showing login form
app.get("/login", function (req, res) {
  res.render("login");
});

//Handling user login
app.post('/login', async function(req, res){
  try {
      // check if the user exists
      const user = await User.findOne({ username: req.body.username });
      if (user) {
        //check if password matches
        const result = req.body.password === user.password;
        if (result) {
          res.render('user');
        } else {
          res.status(400).json({ error: "password doesn't match" });
        }
      } else {
        res.status(400).json({ error: "User doesn't exist" });
      }
    } catch (error) {
      res.status(400).json({ error });
    }
});

// Showing user page
app.get('/user', isLoggedIn, function (req, res) {
  res.render('user');
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/results");
}

let chosenHours = [];
let departureTime = new Date();

app.post('/user', function(req, res) {
  const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {

      departureTime = new Date(req.body.departuretime).getTime();
      data.prices.sort((a, b) => a.endDate - b.endDate);
      const twelveHoursPrior = new Date(departureTime - 12 * 60 * 60 * 1000).toISOString();
      const filteredData = data.prices.filter(item => item.startDate >= twelveHoursPrior);
      const estimatedMileage = parseInt(req.body.estimatedmileage);
      let neededHours;
      if (estimatedMileage < 100) {
        neededHours = 1;
      } else if (estimatedMileage >= 101 && estimatedMileage <= 200) {
        neededHours = 2;
      } else if (estimatedMileage >= 201 && estimatedMileage <= 300) {
        neededHours = 3;
      } else if (estimatedMileage >= 301 && estimatedMileage <= 400) {
        neededHours = 4;
      } else {
        neededHours = 5;
      }
      const sortedData = filteredData.sort((a, b) => a.price - b.price);
      chosenHours = sortedData.slice(0, neededHours);
      //console.log(chosenHours);
      res.render('results', { pagetitle: "Post", chosenHours:chosenHours });
    })
    .catch(err => {
      console.log(err); 
      res.redirect("/results");
    });
});

app.get('/results', (req, res) => {
  res.render('results',
  {
      pagetitle: "Get",
      chosenHours: req.chosenHours
  });
})

module.exports = departureTime;


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App listening to port ${PORT}`));