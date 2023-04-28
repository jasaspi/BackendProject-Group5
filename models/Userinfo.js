const mongoose = require('mongoose');

// Asetettu lähtöaika, arvioitu kilometrimäärä, 
//tarvittavat lataustunnit, tuntien keskihinta, sekä lähtöajan arvioitu lämpötila

const userInfoSchema = new mongoose.Schema({
    username : {
        type: String,
        unique: true,
        require: true
    },
    kilometers : Number,
    averageprice : Number,
    chargehours : Number,
    temperature : Number
    
});

// Departure time to be added also!! What is the datatype? Date?

module.exports = mongoose.model('UserInfo', userInfoSchema);