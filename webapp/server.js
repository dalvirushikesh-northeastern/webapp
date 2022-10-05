const express = require('express');
const randomId = require('random-id');
const app = express(),
      bodyParser = require("body-parser"),
      fs = require('fs'),
      port = 3000;


app.use(bodyParser.json());
app.get('/api/healthz', (req, res) => {
  console.log('api/healthcheck called!!')
  res.json(tasks);
});


app.listen(port, () => {
    console.log(`Server listening on the port::::::${port}`);
});