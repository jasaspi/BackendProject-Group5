const express = require('express');
const exphbs = require('express-handlebars');
const fetch = require('node-fetch');

// Jonna added ones below to make mongo + user auth working
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('express-flash');
require('dotenv').config();
const User = require('./models/User');
const UserInfo = require('./models/Userinfo');
const app = express();
const dbURI = 'mongodb+srv://'+ process.env.DBUSER +':'+ process.env.DBPASSWD +''+ process.env.CLUSTER +'.mongodb.net/'+ process.env.DB +'?retryWrites=true&w=majority'
 
mongoose.connect(dbURI); 

app.engine('handlebars', exphbs.engine({
  defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');

app.use(express.json()) // parse json bodies
app.use(express.urlencoded({extended: false}));
app.use(express.static('public'));
app.use(flash());

app.use(session({
    secret: "This is a secret",
    resave: false,
    saveUninitialized: true
}));


// Passport initials
app.use(passport.initialize());
app.use(passport.session());
  
authUser = async (user, password, done) =>  {
  const ourUser = await User.findOne({ username: user });
  if (ourUser) {
      //check if password matches
      const result = password === ourUser.password;
      if (result) {
        return done (null, ourUser);
      } else {
        return done (null, false, { message : "Password incorrect"});
      }
    } else {
      return done (null, false, { message : "User not found" });
    }
  
}

passport.use(new LocalStrategy(authUser));


passport.serializeUser( (userObj, done) => {
    done(null, userObj)
})

passport.deserializeUser((userObj, done) => {
    done (null, userObj )
})

checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { return next() }
    res.redirect("/login")
  }

checkLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) { 
         return res.redirect("/user")
     }
    next()
}





// ROUTES

// Routes and added by Jonna

//Showing login form
app.get("/login", checkLoggedIn, function (req, res) {
  res.render("login");
});

// Handling user login
app.post ('/login', passport.authenticate('local', {
  successRedirect: '/user',
  failureRedirect: '/login',
  failureFlash: true
}));

// Showing user page
app.get('/user', checkAuthenticated, function (req, res) {
  res.render('user',
  { user: req.user }
  );
});

// Showing user history page
app.get('/history', checkAuthenticated, function (req, res) {
  res.render('history',
  { username: req.user.username }
  );
});


//Handling user logout 

app.get('/logout', function (req, res) {
  req.logout(function(err) {
      if (err) { 
          return next(err); 
      }
      else {
          req.session.destroy();
          res.redirect('/login');
      }
      
    });
});







let chosenHours = [];
let departureTime = new Date();
let departureTimeOut;

app.post('/user', function(req, res) {
  const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {

      departureTime = new Date(req.body.departuretime).getTime();
      data.prices.sort((a, b) => a.endDate - b.endDate);// check last known time for price - data.prices[0]
      const twelveHoursPrior = new Date(departureTime - 12 * 60 * 60 * 1000).toISOString();
      const filteredHours = data.prices.filter(item => item.startDate >= twelveHoursPrior);
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
      const sortedData = filteredHours.sort((a, b) => a.price - b.price);
      chosenHours = sortedData.slice(0, neededHours);
      departureTimeOut = new Date(req.body.departuretime).toISOString();
      //console.log(chosenHours);
      res.render('results', 
        { 
          chosenHours:chosenHours,
          departureTimeOut:departureTimeOut
        });
    })
    .catch(err => {
      console.log(err); 
      res.redirect("/results"); 
    });
});

app.get('/results', (req, res) => {
  res.render('results',
  {
      chosenHours: req.chosenHours
  });
})

module.exports = departureTime;


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App listening to port ${PORT}`));