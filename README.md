# webapp
git flow test

Node Js Application for Cloud 


1) npm install
2) npm run dev

check application on : http://localhost:3000/healthz

terminal check with curl:

curl -v http://localhost:3000/healthz

# post-api

http://localhost:3000/v1/account

test-body
 {
    "first_name":"",
    "last_name":"",
    "username":"",
    "password":""  
 }
 


 # get api 
 http://localhost:3000/v1/account/:id 
- use basic auth and drop credentials 


# put api
http://localhost:3000/v1/account/:id

- use basic auth and drop creditials 
- test body to check update 
-  { 
        
        "first_name": "",
        "last_name": "",
        "password": ""
        
}