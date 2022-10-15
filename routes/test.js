//Package Imports
var mysql = require('mysql2');
const express = require("express");
const app = express();
const {User} = require("../models");
 User.sequelize.sync();
const bcrypt = require("bcryptjs");
const con = express.Router();

const basicAuth = require("express-basic-auth");
app.use(basicAuth);

//Basic Auth implementation 
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

//Health check point 
con.get("/healthz", (req, res) => {
  res.status(200).send();
});


//get user data with sequalize 
con.get("/v1/account/:id", async (req, res) => {
  auth = Basicauthentication(req, res);
  var userName = auth[0];
  var passWord = auth[1];
  await User.findOne({
    where: {
      username: userName,
    },
  })
    .then((dbAcc) => {
      if (dbAcc) {
        const validPass = bcrypt.compareSync(passWord, dbAcc.password);
        if (validPass) {
          if (req.params.id === dbAcc.id) {
            return res.status(200).send(dbAcc);
          } else {
            return res.status(403).send("Forbidden");
          }
        } else {
          return res.status(401).send("Unauthorized");
        }
      } else {
        return res.status(401).send("Unauthorized");
      }
    })
    .catch((err) => {
      if (err) {
        console.log(err);
        return res.status(400).send("Bad Request");
      }
    });
});



   con.post("/v1/account", async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    await User.create({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      username: req.body.username,
      password: hash,
    })
      .then((Acco) => {
        Acco.password = undefined;
        return res.status(201).send(Acco);
      })
      .catch((err) => {
        if (err) {
          return res.status(400).send("Bad Request");
        }
      });
  });






con.put("/v1/account/:id", async (req, res) => {
  // Check if input payload contains any other fields than the editable fields
  const bodyfields = req.body;
  for (let x in bodyfields) {
    if (
      x != "first_name" &&
      x != "last_name" &&
      x != "password" &&
      x != "username"
    ) {
      return res.status(400).send("Bad Request");
    }
  }

  auth = Basicauthentication(req, res);
  var user = auth[0];
  var pass = auth[1];

  await User.findOne({
    where: {
      username: user,
    },
  })
    .then((dbAcc) => {
      if (dbAcc) {
        const validPass = bcrypt.compareSync(pass, dbAcc.password);
        if (validPass) {
          if (req.params.id === dbAcc.id) {
            const Hpassword = req.body.password || pass
            const first = req.body.first_name || dbAcc.first_name
            const last = req.body.last_name || dbAcc.last_name
            
            const hash =  bcrypt.hashSync(Hpassword, 10);
            User.update({
              first_name: first,
                last_name: last,
                password: hash},
              {
              where: {
                username: user,
              },
            }).then((dbAccc) => {
              return res.status(200).send(dbAccc);
            });
          } else {
            return res.status(403).send("Forbidden");
          }
        } else {
          return res.status(401).send("Unauthorized");
        }
      } else {
        return res.status(401).send("Unauthorized");
      }
    })
    .catch((err) => {
      if (err) {
        console.log(err);
        return res.status(400).send("Bad Request");
      }
    });
  });

module.exports = con;
