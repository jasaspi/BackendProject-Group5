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
//const dbURI2 = 'mongodb+srv://'+ process.env.DBUSER +':'+ process.env.DBPASSWD +''+ process.env.CLUSTER +'.mongodb.net/'+ <databaseName> +'?retryWrites=true&w=majority' 

/* Tämä osa suoraan ChatGPT:stä, jotta saadaan molemmat tietokannat yhdistettyä
// Connect to DB1
const db1 = mongoose.createConnection(dbURI1, { useNewUrlParser: true });
db1.on('error', console.error.bind(console, 'DB1 connection error:'));
db1.once('open', function() {
  console.log('Connected to DB1');
  // Use the db1 object to perform database operations
});

// Connect to DB2
const db2 = mongoose.createConnection(dbURI2, { useNewUrlParser: true });
db2.on('error', console.error.bind(console, 'DB2 connection error:'));
db2.once('open', function() {
  console.log('Connected to DB2');
  // Use the db2 object to perform database operations
});
*/

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
app.get('/history', checkAuthenticated, function (req, res) {
  res.render('history',
  { 
    username: req.user.username, title: 'history', layout: 'main'
  });
});
/*
  // Get by id
  app.get('/api/products/:id', (req, res) => {
    const product = data.find((p) => p.id === parseInt(req.params.id));
    if (!product) {
      res.sendStatus(404);
    } else {
      res.json(product);
    }
  });
*/

// Show results page
app.get('/results', (req, res) => {
  res.render('results',
  {
      chosenHours: req.chosenHours, title: 'results', layout: 'main'
  });
})

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

      averagePrice = sum / chosenHours.length;
      console.log('Average price:', averagePrice.toFixed(3));

      console.log(chosenHours);
      res.render('results', 
        { 
          chosenHours:chosenHours,
          departureTimeOut:departureTimeOut
        });

    /*
      // Create - tästä mallia siihen vaiheeseen, kun saadaan tietokanta ylös
      app.post('/api/products', (req, res) => {
        const newProduct = {
          id: data.length + 1,
          name: req.body.name,
          description: req.body.description,
          price: req.body.price,
          isAvailable: req.body.isAvailable,
          createdAt: req.body.createdAt,
          features: req.body.features
        };
        data.push(newProduct);
        res.json(newProduct); 
      });
    */
    })
    .catch(err => {
      console.log(err); 
      res.redirect("/results"); 
    });
});

/* Malliksi aiemmista harjoituksista historia sivua varten, jotta saadaan haettua, luettua, päivitettyä ja poistettua rivejä
  // Update
  app.patch('/api/products/:id', (req, res) => {
    const i = data.findIndex((p) => p.id === parseInt(req.params.id));
    if (i === -1) {
      res.sendStatus(404);
    } else {
      const updatedProduct = {
        ...data[i],
        ...req.body,
      };
      data[i] = updatedProduct;
      res.json(updatedProduct);
    }
  });
  // Delete
  app.delete('/api/products/:id', (req, res) => {
    const i = parseInt(req.params.id);
    //const i = data.findIndex((p) => p.id === parseInt(req.params.id));
    if (i === -1) {
      res.sendStatus(404);
    } else {  
      data = data.filter((p) => p.id !== i);
      //data.splice(i, 1);
      res.sendStatus(204);
    }
  });
*/

module.exports = departureTime;


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App listening to port ${PORT}`));