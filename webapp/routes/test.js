//Package Imports
var mysql = require('mysql2');
const express = require("express");
const app = express();
const connection = require("../utils/db");
const bcrypt = require("bcryptjs");
const con = express.Router();

const basicAuth = require("express-basic-auth");
app.use(basicAuth);

//Basic Auth
function Basicauthentication(req, res, next) {
  var authheader = req.headers.authorization || null;
  if (!authheader) {
    return res.status(400);
  }
  var auth = new Buffer.from(authheader.split(" ")[1], "base64")
    .toString()
    .split(":");
  return auth;
}

//Health check
con.get("/healthz", (req, res) => {
  res.status(200).send();
});

con.get("/v1/account/:id", (req, res) => {
  auth = Basicauthentication(req, res);
  var user = auth[0];
  var pass = auth[1];
  connection.query(
    "SELECT first_name, last_name, password, username, account_created, account_updated FROM users WHERE username= ?",
    [user],
    (err, results, fields) => {
      if (results[0]) {
        const p = results[0].password || null;
        const validPass = bcrypt.compareSync(pass, p);
        if (validPass) {
            connection.query(
            "SELECT id, first_name, last_name, username, account_created, account_updated FROM users WHERE id= ? and username= ?",
            [req.params.id, user],
            (err, results, fields) => {
              if (results[0]) {
                res.send(results);
              } else {
                res.status(403).send("Forbidden");
              }
            }
          );
        } else {
          res.status(401).send("Unauthorized");
        }
      } else {
        res.status(401).send("Unauthorized");
      }
    }
  );
});


// add new user with hash+salt
con.post("/v1/account", async(req, res)=>{
    let regex = new RegExp("[a-z0-9]+@[a-z]+.[a-z]{2,3}");
    regex.test(req.body.username);
    if (!regex.test(req.body.username)) {
      return res.status(400).send("Username should be in email format");
    }
    const data = req.body;
    const hash = await bcrypt.hash(data.password,10);
    console.log(hash);
    connection.query( "SET @id = ?;SET @first_name = ?;SET @last_name = ?;SET @password = ?;SET @username = ?;SET @account_created = ?;SET @account_updated = ?;  INSERT INTO users(id, first_name, last_name, password, username, account_created, account_updated) VALUES (SUBSTR(MD5(RAND()), 1, 8), @first_name, @last_name, @password, @username, now(),now())",
     [
        data.id,
        data.first_name,
        data.last_name,
        hash,
        data.username,
        data.account_created,
        data.account_updated,
      ], (err,result)=>{  
   if(err)
   {
    res.status(400).send("Username already taken");
   }else
   {
   
    res.send(result);
   
   }
   
    })
   });

con.put("/v1/account/:id", async (req, res) => {
    auth = Basicauthentication(req);
    var user = auth[0];
    var pass = auth[1];
    console.log(user);
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
//     const sql =
  
//   "SET @id = ?;SET @first_name = ?;SET @last_name = ?;SET @password = ?;SET @username = ?; UPDATE apidb.users SET  first_name = @first_name, last_name = @last_name,  password = @password, username = @username,  account_updated = now() WHERE ID = @ID and username=@username COLLATE utf8mb4_unicode_ci;";


    //const updatequery =
    
    //"SET @id= ?; SET @first_name = ?;SET @last_name = ?;SET @password = ?; SET @username=?; UPDATE apidb.users SET  first_name = @first_name, last_name = @last_name, password = @password , account_updated = now() WHERE id = @id and username=@username COLLATE utf8mb4_unicode_ci"
   // UPDATE users SET  first_name = @first_name, last_name = @last_name,  password = @password, account_updated = CURRENT_TIMESTAMP WHERE id = @id and username=@username COLLATE utf8mb4_unicode_ci "

   let updateQuery = "UPDATE ?? SET ?? = ?, ?? = ?, ?? = ?, ?? = CURRENT_TIMESTAMP WHERE ?? = ?";
   let qb = req.body;
   let query = mysql.format(updateQuery,["users","first_name",qb.first_name,"last_name",qb.last_name,"password",hash,"account_updated","id",req.params.id]);
    
    
   connection.query(
      "SELECT first_name, last_name, password, username, account_created, account_updated FROM users WHERE id= ? and username= ?",
      [req.params.id, user],
      (err, results, fields) => {
        if (results[0]) {
          const p = results[0].password || null;
          const validPass = bcrypt.compareSync(pass, p);
          console.log(validPass);
          if (validPass === true) {
            console.log("inside validpass");
            connection.query(
                query,
                //"SET @id = ?;SET @first_name = ?;SET @last_name = ?;SET @password = ?;SET @username = ?; UPDATE apidb.users SET  first_name = @first_name, last_name = @last_name,  password = @password, username = @username,  account_updated = now() WHERE ID = @ID; SELECT * FROM users WHERE ID = @ID;",
              //[req.params.id, qb.first_name, qb.last_name,hash,user],
              (err, results, fields) => {
                if(err){
                    console.error(err)
                    res.status(400).send(err)
                    return
                }
                res.send("User Data Updated!!");
              }
            );
          } else {
            res.status(401).send("Unauthorized");
          }
        } else {
          console.log(err);
          res.status(403).send("Forbidden");
        }
      }
    );
  });

module.exports = con;
