const express = require('express');
const randomId = require('random-id');
const app = express(),
      bodyParser = require("body-parser"),
      fs = require('fs'),
      port = 3000;

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// place holder for the data
let tasks = [
  {
    id: 1,
    task: 'task1',
    assignee: 'dhaval',
  },
  {
    id: 2,
    task: 'task2',
    assignee: 'aishwarya',
  },
  {
    id: 3,
    task: 'task3',
    assignee: 'tejas',
  },
  
];

app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/api/healthz', (req, res) => {
  console.log('api/healthcheck called!!')
  res.json(tasks);
});


app.listen(port, () => {
    console.log(`Server listening on the port::::::${port}`);
});