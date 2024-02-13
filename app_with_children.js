import bodyParser from "body-parser";
import { fork } from 'child_process';
import express from "express";
import * as fs from 'fs';
const app = express();
app.use(bodyParser.text({ type: 'text/html' }))
app.use(express.static(process.cwd()))
const port = 3005;

// Create child processes
const children = Array.from({ length: 5 }, createPDFChildProcess);
children.forEach(child => child.isAvailable = true);
console.log('Children created');

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});

app.get('/', function (req, res) {
    res.sendFile('/index.html');
});

app.get("/pdf", (req, res) => {

    const child = findAvailableChildProcess();
    if (!child) {
        res.end("Service Unavailable");
    }

    const html = fs.readFileSync('./test.html', 'utf8');

    usePDFChildProcess(child, html)
        .then((pdf) => {
            const pdfBuffer = Buffer.from(pdf, "binary")
            res.contentType("application/pdf");
            res.appendHeader('Content-Disposition', 'inline; filename=invoice.pdf');
            res.send(pdfBuffer);
        })
        .catch((error) => {
            res.sendStatus(400).send(error.message)
        });
})

app.post("/pdf", (req, res) => {
    const child = findAvailableChildProcess();
    if (!child) {
        res.end("Service Unavailable");
        return;
    }
    const html = req.body || fs.readFileSync('./error.html', 'utf8');
    usePDFChildProcess(child, html)
        .then((pdf) => {
            const pdfBuffer = Buffer.from(pdf, "binary")
            res.contentType("application/pdf");
            res.appendHeader('Content-Disposition', 'inline; filename=invoice.pdf');
            res.send(pdfBuffer);
        })
        .catch((error) => {
            res.sendStatus(400).send(error.message)
        });
});


// Function to find an available child process
function findAvailableChildProcess() {
    return children.find(child => child.isAvailable);
}

// Function to use a child process
function usePDFChildProcess(child, data) {
    return new Promise((resolve, reject) => {
        // Set the child as unavailable
        child.isAvailable = false;

        // Send the data to the child
        child.send(data);

        // Set up the child's response handlers
        child.onResponse = resolve;
        child.onError = reject;
    });
}

function createPDFChildProcess() {
    const child = fork('./create_pdf.js');

    // Listen for the child to send a message back and resolve the promise with the response, and mark as available
    child.on('message', (pdf) => {
        child.isAvailable = true;
        if (child.onResponse) {
            child.onResponse(pdf);
        }
    });

    // Listen for the child to send an error back and reject the promise with the error, and mark as available
    child.on('error', (error) => {
        child.isAvailable = true;
        if (child.onError) {
            child.onError(error);
        }
    });

    return child;
}



