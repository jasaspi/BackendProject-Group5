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

const apiUrl = 'https://api.porssisahko.net/v1/latest-prices.json';

app.engine('handlebars', exphbs.engine({
  defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');

fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    data.prices.sort((a, b) => a.price - b.price);

    console.log(data.prices);
  });




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
  res.redirect("/user");
}

// Routes adde by Jonna Ends here




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App listening to port ${PORT}`));