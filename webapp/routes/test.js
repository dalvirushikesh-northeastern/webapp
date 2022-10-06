//Package Imports
var mysql = require('mysql2');
const express = require("express");
const app = express();
const mysqlConnection = require("../utils/db");
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

//Endpoints for health status check
con.get("/", (req, res) => {
  res.status(200).send();
});

//Health check
con.get("/healthz", (req, res) => {
  res.status(200).send();
});

con.get("/v1/account/:id", (req, res) => {
  auth = Basicauthentication(req, res);
  var user = auth[0];
  var pass = auth[1];
  mysqlConnection.query(
    "SELECT first_name, last_name, password, username, account_created, account_updated FROM users WHERE username= ?",
    [user],
    (err, results, fields) => {
      if (results[0]) {
        const p = results[0].password || null;
        const validPass = bcrypt.compareSync(pass, p);
        if (validPass) {
          mysqlConnection.query(
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
    const data = req.body;
    const hash = await bcrypt.hash(data.password,10);
    console.log(hash);
    mysqlConnection.query( "SET @id = ?;SET @first_name = ?;SET @last_name = ?;SET @password = ?;SET @username = ?;SET @account_created = ?;SET @account_updated = ?;  INSERT INTO users(id, first_name, last_name, password, username, account_created, account_updated) VALUES (SUBSTR(MD5(RAND()), 1, 8), @first_name, @last_name, @password, @username, now(),now())",
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
    res.status(400).send("Bad Request");
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
    
    
    mysqlConnection.query(
      "SELECT first_name, last_name, password, username, account_created, account_updated FROM users WHERE id= ? and username= ?",
      [req.params.id, user],
      (err, results, fields) => {
        if (results[0]) {
          const p = results[0].password || null;
          const validPass = bcrypt.compareSync(pass, p);
          console.log(validPass);
          if (validPass === true) {
            console.log("inside validpass");
            mysqlConnection.query(
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

//   con.put("/v1/account/:id", async (req, res) => {
//     try {
//       // Check if input payload contains any other fields than the editable fields
//       const fields = req.body;
//       for (let key in fields) {
//         if (
//           key != "first_name" &&
//           key != "last_name" &&
//           key != "password" &&
//           key != "username"
//         ) {
//           return res.status(400).send("Bad Request");
//         }
//       }
//       auth = Basicauthentication(req);
//       var user = auth[0];
//       var pass = auth[1];
  
//      let qb = req.body;
//       const sql =
//         "SET @id = ?;SET @first_name = ?;SET @last_name = ?;SET @password = ?;SET @username = ?; UPDATE users SET  first_name = @first_name, last_name = @last_name,  password = @password, username = @username,  account_updated = now() WHERE ID = @id and username=@username COLLATE utf8mb4_unicode_ci;";

//         const selectuser="SELECT id,first_name, last_name, password, username, account_created, account_updated FROM users WHERE username = ?";
//       mysqlConnection.query(
//         selectuser,[fields.username],async (err, results, fields) => {
//             console.log(results);
//           // const password = req.body.password || results[0].password;
//           const first_name = req.body.first_name || results[0].first_name;
//           const last_name = req.body.last_name || results[0].last_name;
//           const hash = await bcrypt.hash(req.body.password || pass, 10);
  
//           if (results[0]) {
//             const p = results[0].password || null;
//             const userMatches = basicAuth.safeCompare(
//               results[0].id,
//               req.params.id
//             );
//             const validPass = bcrypt.compareSync(pass, p);
//             if (validPass) {
//               if (!userMatches) {
//                 return res.status(403).send("Forbidden");
//               }
//             }
//             if (userMatches & validPass) {
//               mysqlConnection.query(sql,[req.params.id, first_name, last_name, hash, user],(err, results, fields) => {
//                   if (results[0]) {
//                     res.status(204).send("No Content");
//                   } else {
//                     res.status(403).send("Forbidden");
//                   }
//                 }
//               );
//             } else {
//               res.status(401).send("Unauthorized");
//             }
//           } else {
//             res.status(401).send("Unauthorized");
//           }
//         }
//       );
//     } catch (e) {
//       return res.status(400).send("Bad Request");
//     }
//   });





module.exports = con;
