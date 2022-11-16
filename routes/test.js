//Package Imports
var mysql = require('mysql2');
const {
  v4: uuidv4
} = require('uuid');
require("dotenv").config()
const express = require("express");
const app = express();
const {User ,Document} = require("../models");
 User.sequelize.sync();
 Document.sequelize.sync();
const bcrypt = require("bcryptjs");
const con = express.Router();
const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3');
const logger = require("../config/logger");
const SDC = require('statsd-client');
const dbConfig = require("../config/config.js");
const sdc = new SDC({
  host: dbConfig.METRICS_HOSTNAME,
  port: dbConfig.METRICS_PORT
});
var start = new Date();
//connecting to s3 bucket and uploading the file 
aws.config.update({
    //secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.region,

});
const BUCKET = process.env.BUCKET
const s3 = new aws.S3();

var sns = new aws.SNS({});
var dynamoDatabase = new aws.DynamoDB({
    apiVersion: '2012-08-10',
    region: process.env.AWS_REGION || 'us-east-1'
});


  const upload = multer({
    storage: multerS3({
        s3: s3,
        ACL: "public-read",
        bucket: BUCKET,
        key: function (req, file, cb) {
            console.log(file);
            cb(null,Date.now().toString()+file.originalname)
        }
    })
})



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
  console.log("Is it hitting?")
    sdc.timing('health.timeout', start);
    logger.info("/health running fine");
    sdc.increment('endpoint.health');
  res.status(200).send();
});


//get user data with sequalize 
con.get("/v1/account/:id", async (req, res) => {
  try{
  auth = Basicauthentication(req, res);
  var userName = auth[0];
  var passWord = auth[1];
   const userr = await User.findOne({
    where: {
      username: userName,
    },
    
  });
      if (userr) {
        const validPass = bcrypt.compareSync(passWord, userr.password);
        if (validPass) {
          if (req.params.id === userr.id) {
            userr.password = undefined;
            logger.info("User data fetched successfully");
            sdc.increment('endpoint.getUser');
            return res.status(200).send(userr);
          } else {
            logger.info("/Forbidden 403 user trying to access");
            return res.status(403).send("Forbidden");
          }
        } else {
          logger.info("/Unauthorized user trying to access");
          return res.status(401).send("Unauthorized");
        }
      } else {
        logger.info("/Unauthorized user trying to access");
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {
      
        console.log(err);
        logger.info("/get user 400 bad request");
        return res.status(400).send("Bad Request");
    }
    });



// // create new user end point with sequelize 
//    con.post("/v1/account", async (req, res) => {
//     try{
//     const hash = await bcrypt.hash(req.body.password, 10);
//     const newuser = await User.create({
//       first_name: req.body.first_name,
//       last_name: req.body.last_name,
//       username: req.body.username,
//       password: hash,
//     });
      
//     newuser.password = undefined;
//     logger.info("/create user success");
//     sdc.increment('endpoint.CreateUser');
//         return res.status(201).send(newuser);
//       }
//       catch(err) {
//         logger.info("/get user 400 bad request");
//           return res.status(400).send(err);
//         }
//   });


con.post("/v1/account", createUser);

// Create a User
async function createUser(req, res, next) {
  console.log('create userrr')
  var hash = await bcrypt.hash(req.body.password, 10);
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(req.body.username)) {
      logger.info("/create user 400");
      res.status(400).send({
          message: 'Enter your Email ID in correct format. Example: abc@xyz.com'
      });
  }
  const getUser = await User.findOne({
      where: {
          username: req.body.username
      }
  }).catch(err => {
      logger.error("/create user error 500");
      res.status(500).send({
          message: err.message || 'Some error occurred while creating the user'
      });
  });

  console.log('verified and existing 1');

 
  if (getUser) {
      console.log('verified and existing', getUser.dataValues.isVerified);
      var msg = getUser.dataValues.isVerified ? 'User already exists! & verified' : 'User already exists! & not verified';
      console.log('verified and existing msg' ,msg);
      
      res.status(400).send({
          message: msg
      });
  } else {
      var user = {
          id: uuidv4(),
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          password: hash,
          username: req.body.username,
          isVerified: false
      };
      console.log('above user');
      User.create(user).then(async udata => {

              const randomnanoID = uuidv4();

              const expiryTime = new Date().getTime();

              // Create the Service interface for dynamoDB
              var parameter = {
                  TableName: 'csye-6225',
                  Item: {
                      'Email': {
                          S: udata.username
                      },
                      'TokenName': {
                          S: randomnanoID
                      },
                      'TimeToLive': {
                          N: expiryTime.toString()
                      }
                  }
              };
              console.log('after user');
              //saving the token onto the dynamo DB
              try {
                  var dydb = await dynamoDatabase.putItem(parameter).promise();
                  console.log('try dynamoDatabase', dydb);
              } catch (err) {
                  console.log('err dynamoDatabase', err);
              }

              console.log('dynamoDatabase', dydb);
              var msg = {
                  'username': udata.username,
                  'token': randomnanoID
              };
              console.log(JSON.stringify(msg));

              const params = {

                  Message: JSON.stringify(msg),
                  Subject: randomnanoID,
                  TopicArn: 'arn:aws:sns:us-east-1:981331903688:verify_email'

              }
              var publishTextPromise = await sns.publish(params).promise();

              console.log('publishTextPromise', publishTextPromise);
              res.status(201).send({
                  id: udata.id,
                  first_name: udata.first_name,
                  last_name: udata.last_name,
                  username: udata.username,
                  account_created: udata.createdAt,
                  account_updated: udata.updatedAt,
                  isVerified: udata.isVerified
              });

          })
          .catch(err => {
              logger.error(" Error while creating the user! 500");
              res.status(500).send({
                  message: err.message || "Some error occurred while creating the user!"
              });
          });
  }
}

// Verify user
async function verifyUser(req, res, next) {
  console.log('verifyUser :');
  console.log('verifyUser :', req.query.email);
  const user = await getUserByUsername(req.query.email);
  if (user) {
      console.log('got user  :');
      if (user.dataValues.isVerified) {
          res.status(202).send({
              message: 'Already Successfully Verified!'
          });
      } else {

          var params = {
              TableName: 'csye-6225',
              Key: {
                  'Email': {
                      S: req.query.email
                  },
                  'TokenName': {
                      S: req.query.token
                  }
              }
          };
          console.log('got user  param:');
          // Call DynamoDB to read the item from the table

          dynamoDatabase.getItem(params, function (err, data) {
              if (err) {
                  console.log("Error", err);
                  res.status(400).send({
                      message: 'unable to verify'
                  });
              } else {
                  console.log("Success dynamoDatabase getItem", data.Item);
                  try {
                      var ttl = data.Item.TimeToLive.N;
                      var curr = new Date().getTime();
                      console.log(ttl);
                      console.log('time diffrence', curr - ttl);
                      var time = (curr - ttl) / 60000;
                      console.log('time diffrence ', time);
                      if (time < 5) {
                          if (data.Item.Email.S == user.dataValues.username) {
                              User.update({
                                  isVerified: true,
                              }, {
                                  where: {
                                      username: req.query.email
                                  }
                              }).then((result) => {
                                  if (result == 1) {
                                      logger.info("update user 204");
                                      sdc.increment('endpoint.userUpdate');
                                      res.status(200).send({
                                          message: 'Successfully Verified!'
                                      });
                                  } else {
                                      res.status(400).send({
                                          message: 'unable to verify'
                                      });
                                  }
                              }).catch(err => {
                                  res.status(500).send({
                                      message: 'Error Updating the user'
                                  });
                              });
                          } else {
                              res.status(400).send({
                                  message: 'Token and email did not matched'
                              });
                          }
                      } else {
                          res.status(400).send({
                              message: 'token Expired! Cannot verify Email'
                          });
                      }
                  } catch (err) {
                      console.log("Error", err);
                      res.status(400).send({
                          message: 'unable to verify'
                      });
                  }
              }
          });

      }
  } else {
      res.status(400).send({
          message: 'User not found!'
      });
  }
}

//Get a User
async function getUser(req, res, next) {
  const user = await getUserByUsername(req.user.username);
  if (user) {
      logger.info("get user 200");
      res.status(200).send({
          id: user.dataValues.id,
          first_name: user.dataValues.first_name,
          last_name: user.dataValues.last_name,
          username: user.dataValues.username,
          account_created: user.dataValues.createdAt,
          account_updated: user.dataValues.updatedAt,
          isVerified: user.dataValues.isVerified
      });
  } else {
      res.status(400).send({
          message: 'User not found!'
      });
  }
}

// Update a user

async function updateUser(req, res, next) {
  if (req.body.username != req.user.username) {
      logger.error("can not update user 400");
      res.status(400);
  }
  if (!req.body.first_name || !req.body.last_name || !req.body.username || !req.body.password) {
      logger.error("/update user failed 400");
      res.status(400).send({
          message: 'Enter all parameters!'
      });
  }
  User.update({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      password: await bcrypt.hash(req.body.password, 10)
  }, {
      where: {
          username: req.user.username
      }
  }).then((result) => {
      if (result == 1) {
          logger.info("update user 204");
          sdc.increment('endpoint.userUpdate');
          res.sendStatus(204);
      } else {
          res.sendStatus(400);
      }
  }).catch(err => {
      res.status(500).send({
          message: 'Error Updating the user'
      });
  });
}

async function getUserByUsername(username) {

  return User.findOne({
      where: {
          username: username
      }
  });
}







con.put("/v1/account/:id", async (req, res) => {
  // Checking  any other fields than the editable fields
  try{
  const bodyfields = req.body;
  for (let x in bodyfields) {
    if (
      x != "first_name" &&
      x != "last_name" &&
      x != "password" &&
      x != "username"
    ) {
      logger.info("/get user 400 bad request");
      return res.status(400).send("Bad Request");
    }
  }

  auth = Basicauthentication(req, res);
  var user = auth[0];
  var pass = auth[1];

 const dbAcc = await User.findOne({
    where: {
      username: user,
    },
  });
    if(dbAcc) {
     
        const validPass = bcrypt.compareSync(pass, dbAcc.password);
        if (validPass) {
          if (req.params.id === dbAcc.id) {
            const Hpassword = req.body.password || pass
            const first = req.body.first_name || dbAcc.first_name
            const last = req.body.last_name || dbAcc.last_name
            
            const hash =  bcrypt.hashSync(Hpassword, 10);
            const Accu = await User.update({
              first_name: first,
                last_name: last,
                password: hash},
              {
              where: {
                username: user,
              },
            });
            logger.info("update user 204");
            sdc.increment('endpoint.userUpdate');
              return res.status(200).send("");
            
          } else {
            logger.info("/update user 403 Forbidden");
            return res.status(403).send("Forbidden");
          }
        } else {
          logger.info("/update user 401 unauthorized");
          return res.status(401).send("Unauthorized");
        }
      } 
      else {
        logger.info("/update user 401 unauthorized");
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err)  {
        console.log(err);
        logger.info("/get user 400 bad request");
        return res.status(400).send("Bad Request");
      }
    });
 


// Starting of document endpoints/////////////////////////////////////////////////////////////

// endpoint to upload the document 
const Ufile  = upload.single("file");
con.post("/v1/documents", async (req, res) => {
  try{
  auth = Basicauthentication(req, res);
  var userName = auth[0];
  var passWord = auth[1];
   const userr = await User.findOne({
    where: {
      username: userName,
    },
  });
      if (userr) {
        const CorrectPass = bcrypt.compareSync(passWord, userr.password);
        if (CorrectPass) {     
          Ufile(req, res, async (err) => {
            if (err) {
              logger.info("/doc create  400 bad request");
              res.status(400).send("Bad Request");
            }
            const docx = await Document.create({
              user_id: userr.id,
               name: req.file.key,
               s3_bucket_path: req.file.location
            });
            logger.info("/doc created successfully");
            sdc.increment('endpoint.DocCreate');
            res.status(201).send(docx);
  
          });
         } else {
          logger.info("/doc create 401 unauthorized");
          return res.status(401).send("Unauthorized");
        }
      } else {
        logger.info("/doc create 401 unauthorized");
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {
      
        console.log(err);
        logger.info("/doc create 400 bad request");
        return res.status(400).send("Bad Request");
    }
    });


// get list of all documents uploaded 
con.get("/v1/documents", async (req, res) => {
  try{
  auth = Basicauthentication(req, res);
  var userName = auth[0];
  var passWord = auth[1];
   const userr = await User.findOne({
    where: {
      username: userName,
    },
  });
      if (userr) {
        const CorrectPass = bcrypt.compareSync(passWord, userr.password);
        if (CorrectPass) {     
          
            const docx = await Document.findAll({
              where: {
                user_id: userr.id
              },
            });
            
            if(docx){
              logger.info("/doc list fetched successfully");
              sdc.increment('endpoint.DocGet');
            res.status(200).send(docx);
            }
            else{
              logger.info("/doc 403 Forbidden");
              return res.status(403).send("forbidden");
            }
        
         } else {
          logger.info("/doc list 401 unauthorized");
          return res.status(401).send("Unauthorized");
        }
      } else {
        logger.info("/doc list 401 unauthorized");
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {
      
        console.log(err);
        logger.info("/doc list 400 bad request");
        return res.status(400).send("Bad Request");
    }
    });




// get details of document with id 
con.get("/v1/documents/:doc_id", async (req, res) => {
  try{
  auth = Basicauthentication(req, res);
  var userName = auth[0];
  var passWord = auth[1];
   const userr = await User.findOne({
    where: {
      username: userName,
    },
  });
      if (userr) {
        const CorrectPass = bcrypt.compareSync(passWord, userr.password);
        if (CorrectPass) {    
          const document_id = req.params.doc_id; 
            const docx = await Document.findOne({
              where: {
                user_id: userr.id,
                doc_id:document_id,
              },
            });
            if(docx){
              logger.info("/doc fetched successfully");
              sdc.increment('endpoint.GetDocID');
              res.status(200).send(docx);
            }
            else{
              logger.info("/doc 403 Forbidden");
              return res.status(403).send("Forbidden");
            }
            
         } else {
          logger.info("/doc 401 unauthorized");
          return res.status(401).send("Unauthorized");
        }
      } else {
        logger.info("/doc 401 unauthorized");
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {

      
        console.log(err);
        logger.info("/doc 400 bad request");
        return res.status(400).send("Bad Request");
    }
    });



// delete document with basic auth
con.delete("/v1/documents/:doc_id", async (req, res) => {
      try{
      auth = Basicauthentication(req, res);
      var userName = auth[0];
      var passWord = auth[1];
       const userr = await User.findOne({
        where: {
          username: userName,
        },
      });
          if (userr) {
            const CorrectPass = bcrypt.compareSync(passWord, userr.password);
            if (CorrectPass) {    
              const document_id = req.params.doc_id; 
                const docx = await Document.findOne({
                  where: {
                    user_id: userr.id,
                    doc_id:document_id,
                  },
                });
                if (docx) {
                  await s3.deleteObject({Bucket:BUCKET,Key: docx.name}).promise();
                  const del = await Document.destroy({
                    where: {
                      user_id: userr.id,
                      doc_id:document_id,
                    },

                  });
                  logger.info("delete user 204");
                  sdc.increment('endpoint.userDelete');
                   res.sendStatus(204);
                  
                }
                else{
                  logger.info("/doc delete 403 Forbidden");
                  return res.status(404).send("Not Found");
                }
             } else {
              logger.info("/doc delete 401 unauthorized");
              return res.status(401).send("Unauthorized");
            }
          } else {
            logger.info("/doc delete 401 unauthorized");
            return res.status(401).send("Unauthorized");
          }
        }
        catch(err) {
          
            console.log(err);
            logger.info("/doc delete 400 bad request");
            return res.status(400).send("Bad Request");
        }
        });



module.exports = con;
