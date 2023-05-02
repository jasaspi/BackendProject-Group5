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

app.set('view engine', 'handlebars');

app.use(express.json()) // parse json bodies
app.use(express.urlencoded({extended: false}));
app.use(express.static('public'));
app.use(flash());

app.use(session({
    secret : process.env.SESSION_SECRET,
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

// Tätä käytetään navbarin näkyvyyteen kirjautuneena/ei kirjautuneena
app.use(function (req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

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

// Showing user page -- Tälle sivulle pääsee vain kirjautuneena
app.get('/user', checkAuthenticated, function (req, res) {
  res.render('user',
  { user: req.user, title: 'User', layout: 'main' }
  );
});

// Showing user history page -- Tälle sivulle pääsee vain kirjautuneena
app.get('/history', checkAuthenticated, async function (req, res) {
  const usageInfo = await usage_db.model('Usage', UsageSchema).find({ user: req.user.username });
  let timeNow = new Date();
  let usageFuture = [];
  let usagePast = [];

  usageInfo.forEach(info => {
    if(info.departureTime > timeNow) {
      usageFuture.push(info);
    }
    else if(info.departureTime < timeNow) {
      usagePast.push(info);
    }
  });

  res.render('history',
  { 
    usageInfo: usageInfo, 
    usageFuture: usageFuture, 
    usagePast: usagePast, 
    timeNow: timeNow, 
    username: req.user.username, 
    title: 'history', 
    layout: 'main',
    active: {history: true },
    page_name: 'history'
  });
});

//Delete
app.delete('/usage/:id', checkAuthenticated, async (req, res) => {
  const usageId = req.params.id;
  try {
    const deletedUsage = await usage_db.model('Usage').findByIdAndDelete(usageId);
    res.redirect('/history');
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.patch('/usage/:id', checkAuthenticated, async (req, res) => {
  const usageId = req.params.id;
  const updatedUsage = req.body;

  try {
    const result = await usage_db.model('Usage').findByIdAndUpdate(usageId, updatedUsage);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});



// Show results page -- Tälle sivulle pääsee vain kirjautuneena
app.get('/results', checkAuthenticated, (req, res) => {
  res.render('results',
  {
      chosenHours: req.chosenHours, 
      title: 'results', 
      layout: 'main',
      active: {results: true },
      page_name: 'results'
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

app.post('/results', checkAuthenticated, function(req, res) {
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
      console.log('Average price:', temp.toFixed(3));
      
      

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