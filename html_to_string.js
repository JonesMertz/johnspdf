import * as fs from 'fs';

// read a file and write it to a string
// Path: html_to_string.js

function htmlToString(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    return html;
}

const jsonObject = {
    "html": htmlToString('./test.html'),
    "header": htmlToString('./header.html'),
    "footer": htmlToString('./footer.html'),
    "saveToFile": false,
    "fileName": "test",
    "margin": {
        "top": 140,
        "bottom": 80,
        "right": 20,
        "left": 20,
    }
}

fs.writeFile("test.json", JSON.stringify(jsonObject), "utf8", (err) => { });

console.log(jsonObject)
