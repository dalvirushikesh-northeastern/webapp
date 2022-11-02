//Package Imports
var mysql = require('mysql2');
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

//connecting to s3 bucket and uploading the file 
aws.config.update({
    //secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.region,

});
const BUCKET = process.env.BUCKET
const s3 = new aws.S3();


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
            return res.status(200).send(userr);
          } else {
            return res.status(403).send("Forbidden");
          }
        } else {
          return res.status(401).send("Unauthorized");
        }
      } else {
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {
      
        console.log(err);
        return res.status(400).send("Bad Request");
    }
    });



// create new user end point with sequelize 
   con.post("/v1/account", async (req, res) => {
    try{
    const hash = await bcrypt.hash(req.body.password, 10);
    const newuser = await User.create({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      username: req.body.username,
      password: hash,
    });
      
    newuser.password = undefined;
        return res.status(201).send(newuser);
      }
      catch(err) {
      
          return res.status(400).send(err);
        }
  });


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
             
              return res.status(200).send("");
            
          } else {
            return res.status(403).send("Forbidden");
          }
        } else {
          return res.status(401).send("Unauthorized");
        }
      } 
      else {
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err)  {
        console.log(err);
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
              res.status(400).send("Bad Request");
            }
            const docx = await Document.create({
              user_id: userr.id,
               name: req.file.key,
               s3_bucket_path: req.file.location
            });
            
            res.status(201).send(docx);
  
          });
         } else {
          return res.status(401).send("Unauthorized");
        }
      } else {
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {
      
        console.log(err);
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
            res.status(200).send(docx);
            }
            else{
              return res.status(403).send("forbidden");
            }
        
         } else {
          return res.status(401).send("Unauthorized");
        }
      } else {
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {
      
        console.log(err);
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
              res.status(200).send(docx);
            }
            else{
              return res.status(403).send("Forbidden");
            }
            
         } else {
          return res.status(401).send("Unauthorized");
        }
      } else {
        return res.status(401).send("Unauthorized");
      }
    }
    catch(err) {
      
        console.log(err);
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
                   res.sendStatus(204);
                  
                }
                else{

                  return res.status(404).send("Not Found");
                }
             } else {
              return res.status(401).send("Unauthorized");
            }
          } else {
            return res.status(401).send("Unauthorized");
          }
        }
        catch(err) {
          
            console.log(err);
            return res.status(400).send("Bad Request");
        }
        });


// // endpoint to get the document 
// con.delete('/v1/documents/:filename', async (req, res)=> {
//   const filename = req.params.filename
//   await s3.deleteObject({ Bucket:BUCKET,Key:filename}).promise();
//   res.send("file deleted Successfully");




      // });
  
  









module.exports = con;
