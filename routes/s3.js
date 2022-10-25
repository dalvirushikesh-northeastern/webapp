const S3 = require ('aws-sdk/clients/s3')
const fs = require('fs')
require("dotenv").config()

const bucketName = process.env.BUCKET
const region = process.env.REGION
const accessKeyId = process.env.ACCESS_KEY
const secretAccessKey = process.env.ACCESS_SECRET

const s3 = new S3({
    region,
    accessKeyId,
    secretAccessKey

})

// function to upload file to s3
 function uploadFile(file){
     const fileStream = fs.createReadStream(file.path)

     const uploadParams ={
        Bucket:bucketName,
        Body:fileStream,
        key:file.filename
     }
     return s3.upload(uploadParams).promise()
}
exports.uploadFile = uploadFile