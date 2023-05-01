const express = require('express');
const exphbs = require('express-handlebars');
const fetch = require('node-fetch');
const Handlebars = require('handlebars');


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
const dbURI2 = 'mongodb+srv://' + process.env.DBUSER2 + ':' + process.env.DBPASSWD2 + '' + process.env.CLUSTER2 + '.mongodb.net/' + process.env.DB2 + '?retryWrites=true&w=majority'

mongoose.connect(dbURI)
  .then(() => console.log('Connected to user_db'))
  .catch(err => console.log('Error connecting to user_db:', err));

const usage_db = mongoose.createConnection(dbURI2, { useNewUrlParser: true, useUnifiedTopology: true });
  usage_db.on('error', err => console.log('Error connecting to usage_db:', err));
  usage_db.once('open', () => console.log('Connected to usage_db'));

const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');


const hbs = exphbs.create({
  defaultLayout: 'main',
  handlebars: allowInsecurePrototypeAccess(Handlebars),
});

app.engine('handlebars', hbs.engine);
/*
app.engine('handlebars', exphbs.engine({
  defaultLayout: 'main',
  allowedProtoMethods: {
    departureTime: true,
    estimatedMileage: true,
    neededHours: true,
    averagePrice: true
  }
}));*/

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
  res.render("login", { title: 'Login', layout: 'main' });
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
  { user: req.user, title: 'User', layout: 'main' }
  );
});

// Showing user history page
app.get('/history', checkAuthenticated, async function (req, res) {
  const usageInfo = await usage_db.model('Usage').find({ user: req.user.username });
  res.render('history',
  { 
    usageInfo: usageInfo, username: req.user.username, title: 'history', layout: 'main'
  });
});

// Show results page
app.get('/results', (req, res) => {
  res.render('results',
  {
      chosenHours: req.chosenHours, title: 'results', layout: 'main'
  });
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
let neededHours;
let averagePrice;

// Define the Usage schema
const UsageSchema = new mongoose.Schema({
  user: {    type: String,  },
  departureTime: {    type: Date,  },
  estimatedMileage: {    type: Number,  },
  neededHours: {    type: Number,  },
  averagePrice: {    type: Number,  }
});

app.post('/results', function(req, res) {
  const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {

      departureTime = new Date(req.body.departuretime).getTime();
      data.prices.sort((a, b) => a.endDate - b.endDate);// check last known time for price - data.prices[0]
      const twelveHoursPrior = new Date(departureTime - 12 * 60 * 60 * 1000).toISOString();
      const filteredHours = data.prices.filter(item => item.startDate >= twelveHoursPrior);
      const estimatedMileage = parseInt(req.body.estimatedmileage);
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

      let sum = 0;
      for (let i = 0; i < chosenHours.length; i++) {
        sum += chosenHours[i].price;
      }

      temp = sum / chosenHours.length;
      averagePrice = temp.toFixed(3);
      console.log('Average price:', averagePrice.toFixed(3));

      const usageData = {
        user: req.user?.username,
        departureTime: new Date(req.body.departuretime),
        estimatedMileage: estimatedMileage,
        neededHours: neededHours,
        averagePrice: averagePrice
      };
      if (mongoose.models.Usage) {
        delete mongoose.models.Usage;
      }
      const Usage = usage_db.model('Usage', UsageSchema);
      const usage = new Usage(usageData);
      usage.save()
        .then(() => {
          //console.log("Tiedot tallennettiin onnistuneesti");
          res.redirect("/history");
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/history"); 
        });
    })
});

module.exports = departureTime;


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App listening to port ${PORT}`));