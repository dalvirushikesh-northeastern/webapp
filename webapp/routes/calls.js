var mysql = require('mysql2');
const express = require('express');
const connection = require("../utils/db")
const con = express.Router(); 
const app = express();
const bcrypt = require("bcryptjs")
const basicAuth = require("express-basic-auth");
app.use(basicAuth);


//Testing Basic Auth 
//Trial
function authentication(req, res) {
    var authheader = req.headers.authorization;
    // console.log(req.headers);
    console.log(authheader);
  
    if (!authheader) {
      var err = new Error("You are not authenticated!");
      res.setHeader("WWW-Authenticate", "Basic");
      err.status = 401;
      return next(err);
    }
  
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");
    console.log(auth);
    var user = auth[0];
    var pass = auth[1];
    console.log(user);
    console.log(pass);
    return auth;
  
  }



con.get('/healthz', (req, res) => {
    

    res.status(200).send();
  });
  


// add new user with hash+salt
con.post("/v1/account", async(req, res)=>{
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
    res.send(err)
   }else
   {
   
    res.send(result);
   
   }
   
    })
   });

//    function select_user(user, res) {
    
  
//     let selectQuery = 'SELECT ??, ??, ??, ?? FROM ?? WHERE ?? = ?';    
  
//     let query = mysql.format(selectQuery,["first_name","last_name","account_created","account_updated","users","username",user]);
  
//     connection.query(query,(err, data) => {
  
//         if(err) {
  
//             res.status(400).send(err)
  
//             return;
  
//         }
  
//         // rows fetch
//         res.status(200)
  
//         res.json(data[0])
  
//     });
  
//   }



//working get 
  con.get("/v1/account/:id", async(req, res)=>{

    auth = authentication(req);
    var user = auth[0];
    var pass = auth[1];
    console.log(user);
    console.log(pass);
    const password = req.body;
   
    let selectQuery =   "SELECT first_name, last_name, password, username, account_created, account_updated FROM users WHERE id= ? and username= ?";    
  
    
    connection.query(selectQuery,
        [req.params.id,user], (err, results,fields) => {
        if (results[0]) {
            const pp = results[0].password || null;
            const correctpass = bcrypt.compareSync(pass,pp);

            if(correctpass){
                connection.query(
                    "SELECT id, first_name, last_name, username, account_created, account_updated FROM users WHERE id= ? and username= ?",
                    [req.params.id, user],
                    (err,results,fields)=>{
                        res.send(results);
                    }
                );
            }
            else{
                res.status(401).send("Not Authorized!!")
            }}
            else{
                console.log(err);
                res.status(403).send("Forbidden");
            }
    
    
        });});


//update with authentication

async function update_user(data, res) {
    console.log("updated called!!")

    let hash = await bcrypt.hash(data.password, 10)
  
    let updateQuery = "UPDATE ?? SET ?? = ?, ?? = ?, ?? = ?, ?? = CURRENT_TIMESTAMP WHERE ?? = ?";
  
    let query = mysql.format(updateQuery,["users","first_name",data.first_name,"last_name",data.last_name,"password",hash,"account_updated","username",data.username]);
  
    connection.query(query,(err, response) => {
  
        if(err) {
  
            console.error(err);
  
            res.status(400).send(err)
  
            return;
  
        }
  
        // rows updated
  
        console.log(response.affectedRows);
  
        if(response.affectedRows < 1){
  
          res.status(400).send("User not found")
  
          return;
  
        }
  
        res.status(200).send("Updated User")
  
    });
  
  }


   
// // api to update the previous user
//    app.put("/v1/account/:id", async(req, res) => {
//     let qb = req.body;
//     let hash = await bcrypt.hash(qb.password, 10)

//     const sql =
  
//       "SET @id = ?;SET @first_name = ?;SET @last_name = ?;SET @password = ?;SET @username = ?; UPDATE apidb.users SET  first_name = @first_name, last_name = @last_name,  password = @password, username = @username,  account_updated = now() WHERE ID = @ID COLLATE utf8mb4_unicode_ci;";
  
//     connection.query(
  
//       sql,
  
//       [req.params.id, qb.first_name, qb.last_name, hash, qb.username],
  
//       (err, response, fields) => {
//         if(err) {
  
//             console.error(err);
  
//             res.status(400).send(err)
  
//             return;
  
//         }
  
//         // rows updated
  
//         console.log(response.affectedRows);
  
//         if(response.affectedRows < 1){
  
//           res.status(400).send("User not found")
  
//           return;
  
//         }
  
//         res.status(200).send("Updated User")
  
        
  
//       }
  
//     );
  
//   });

//


async function checkPass(data, res) {

    let Pass = data.password;
  
    let selectQuery = 'SELECT ?? FROM ?? WHERE ?? = ?';    
  
    let query = mysql.format(selectQuery,["password","users","username", data.username]);
  
    connection.query(query, (err, data) => {
  
      if (err) {
  
        console.error(err);
  
        res.status(400).send(err);
  
        return;
  
      }
  
      // Compare Password
  
      console.log(data);
  
      try{
  
        bcrypt.compare(Pass, data[0].password).then(isMatch => {
  
          if (isMatch) {
  
            return true
  
          } else {
  
            return res.status(400).json({ password: "Password incorrect" });
  
          }
  
        })
  
      }catch(e){
  
        console.log(e);
  
        res.status(400).send('Invalid User');
  
      }
  
    });
  
  }



con.put('/v1/account', (req, res) => {

    if (checkPass(req.body, res)){
  
      update_user(req.body, res);
  
    }
  
  })


 //delete data api
//  con.delete("/account/:id",(req, res)=>{
    
//     connection.query(
//         "DELETE FROM users WHERE id = ? ",
//      [req.params.id], (err,result)=>{  
//    if(!err)
//    {
//     res.send("id has been deleted successfully!!!")
//    }else
//    {
//     console.log(err)
//    }
   
//     })
//    });





  module.exports = con;