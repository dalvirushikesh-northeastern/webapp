const express = require('express');
const randomId = require('random-id');
const app = express(),
      bodyParser = require("body-parser"),
      fs = require('fs'),
      port = 3000;


app.use(bodyParser.json());
app.get('/api/healthz', (req, res) => { 
 
  res.send("200 OK");
});


app.listen(port, () => {
    console.log(`Server listening on the port::::::${port}`);
});