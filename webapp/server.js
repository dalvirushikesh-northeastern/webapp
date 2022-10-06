
const express = require('express');
const app = express();
const apidbRoutes = require("./routes/test");  
const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(apidbRoutes);
    



//setting port 
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on the port::::::${port}`);
});