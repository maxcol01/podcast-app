const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const CryptoJS = require("crypto-js");
const fetch = require("node-fetch");


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000 ; // potential of having another port.

// using express to serve the static webpage by searching the directory name "public"
app.use(express.static(path.join(__dirname,"public")));



const authKEY = process.env.AUTH_KEY;
const secretKey = process.env.SECRET_KEY
const useragent = process.env.USER_AGENT
const apiEndpoint = process.env.API_ENDPOINT





app.listen(PORT, ()=>{
    console.log(`Server is running at port:  http://localhost:${PORT} pointing to ${apiEndpoint}`)
})