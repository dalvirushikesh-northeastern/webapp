var mysql = require('mysql2');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'California@12',
    database : 'apidb',
    multipleStatements: true
  });
  
  module.exports =connection;