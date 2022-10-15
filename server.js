
const express = require('express');
const app = express();
const apidbRoutes = require("./routes/test");  
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const db = require('./models');

app.use(bodyParser.json());
app.use(apidbRoutes);
    


//setting port 

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server listening on the port::::::${port}`);
    });

