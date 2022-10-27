
require("dotenv").config();
  module.exports ={

    host:process.env.host,
    username: process.env.user,
    password:process.env.password,
    database:process.env.database,
    dialect:"mysql",
    pool: {
      max: 5,
      min: 0,
      idle:1000,
    },
  
  };