// Config set 
require('dotenv').config();

// Connect db
// const mongoConnect = require('./src/db');
const botProgram = require('./src/bot');

// mongoConnect(async () => {
    // await botProgram.start();
// });

new Promise(async (resolve) => {
    await botProgram.start();
    resolve();
});