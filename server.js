const express = require("express");
const dotenv = require("dotenv");
const path = require("path")
const {join} = require("path");

const app = express();
const PORT = 3000;

const env = dotenv.config();
AUTH_KEY = process.env.AUTH_KEY;
SECRET_KEY= process.env.SECRET_KEY
USER_AGENT= process.env.USER_AGENT
API_ENDPOINT= process.env.API_ENDPOINT


app.get("/", (req,res)=>{
    res.sendFile(join(__dirname, "index.html"));
})

app.listen(PORT, ()=>{
    console.log(`Server is running at port:  localhost:${PORT}`)
})