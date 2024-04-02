import bodyParser from "body-parser";
import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.SERVER_PORT || 8080;
app.use((req, res, next) => {
    if (req.url === '/') {
        const timeStamp = new Date();
        console.log(timeStamp.toLocaleString("uk"), "| GET ->", req.url);

    }
    next();
});
app.use(bodyParser.text({ type: 'text/html' }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'))
app.listen(port)
console.log(`Server started on: ${port}`)