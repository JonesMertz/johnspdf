import * as fs from 'fs';
// function that takes a path to an image and returns a base64 string

function pictureToBase64(imagePath) {
    // read binary data
    const bitmap = fs.readFileSync(imagePath);
    // convert binary data to base64 encoded string
    return Buffer.from(bitmap).toString('base64');
}

const base64String = pictureToBase64('./john-logo.png');

console.log(base64String)