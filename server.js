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

const authKey = process.env.AUTH_KEY;
const secretKey = process.env.SECRET_KEY
const userAgent = process.env.USER_AGENT
const apiEndpoint = process.env.API_ENDPOINT

// function for authorization headers (multiple calls)
const generateAuthHeader = function (){
    const apiHeaderTime = Math.floor(new Date().getTime() / 1000);
    const hash = CryptoJS.SHA1(authKey + secretKey + apiHeaderTime).toString(CryptoJS.enc.Hex);
    return {
        "User-Agent":userAgent,
        "X-Auth-Key":authKey,
        "X-Auth-Date":apiHeaderTime.toString(),
        "Authorization": hash
    };
};


// Search for podcast
app.get("/api/search", async (req,res)=>{
    const query = req.query.q;
    if (!query){
        return res.status(400).json({error: "Query Parameter is required"});
    }

    const headers = generateAuthHeader();

    try{
        const response = await fetch(`${apiEndpoint}/api/search/?q=${encodeURI(query)}`, {
            method:"GET",
            headers: headers
        });

        if (response.ok && response.headers.get("content-type").includes("application/json")){
            const data = await  response.json();
            res.json(data);
        }else {
            const rawText = await response.text();
            console.log("Raw Response:", rawText);
            res.status(500).json({error:"Invalid response from API", rawText})
        }
    }catch (error){
        console.error("Error fetching API:", error.message);
        res.status(500).json({error:error.message});
    }
});


app.listen(PORT, ()=>{
    console.log(`Server is running at port:  http://localhost:${PORT} pointing to ${apiEndpoint}`)
})