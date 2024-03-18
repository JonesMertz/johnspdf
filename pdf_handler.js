import bodyParser from "body-parser";
import { fork } from 'child_process';
import express from "express";
import * as fs from 'fs';
const app = express();
app.use(bodyParser.text({ type: 'text/html' }))
app.use(bodyParser.json())
app.use(express.static(process.cwd()))
const port = process.env.PDF_HANDLER_PORT || 3005;
const maxChildren = process.env.PDF_HANDLER_MAX_CHILDREN || 10;
const requestQueue = [];
const pdfGeneratorPath = './create_pdf.js';

function pushToQueue(res, pdfData) {
    requestQueue.push({ res: res, pdfData: pdfData });
}

// Create child processes
const children = Array.from({ length: 5 }, createPDFChildProcess);

// children will by default not be available therefore we need to set them as available initially
children.forEach(child => child.isAvailable = true);

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});

app.get('/', function (req, res) {
    res.sendFile('/index.html');
});

app.get("/pdf", (req, res) => {
    const html = fs.readFileSync('./public/test.html', 'utf8');
    const pdfData = {
        html: html,
        saveToFile: false
    }

    const child = findAvailableChildProcess();

    if (!child) {
        pushToQueue(res, pdfData);
        return;
    }

    handlePDFRequest(res, pdfData, child);
})

app.post("/pdf", (req, res) => {
    validateRequest(req, res);
    console.log("Request received")

    const child = findAvailableChildProcess();
    const pdfData = createPDFDataFromRequest(req);

    if (!child) {
        pushToQueue(res, pdfData);
        return;
    }


    handlePDFRequest(res, pdfData, child);

    function validateRequest(req, res) {
        if (!req.body.html) {
            res.status(400).send("Missing required parameter: html");
        }
    }
});

function killChildProcess(child) {
    child.kill();
    children.splice(children.indexOf(child), 1);
}

/**
 * Creates a PDF data object from a request.
 * @param {Object} req - The request object.
 * @param {string} req.body.html - The HTML content of the PDF.
 * @param {boolean} req.body.saveToFile - Indicates whether to save the PDF to a file.
 * @param {Object} req.body.margin - The margin configuration of the PDF.
 * @param {number} req.body.margin.top - The top margin.
 * @param {number} req.body.margin.right - The right margin.
 * @param {number} req.body.margin.bottom - The bottom margin.
 * @param {number} req.body.margin.left - The left margin.
 * @param {Object} req.body.header - The HTML content of the header.
 * @param {Object} req.body.footer - The HTML content of the footer.
 * @param {boolean} req.body.landscape - Indicates whether the PDF should be in landscape orientation.
 * @param {string} req.body.format - The format of the PDF. For example: "A4".
 * @returns {PDFData} The PDF data object.
 */
function createPDFDataFromRequest(req) {

    const pdfData = {
        html: req.body.html,
        saveToFile: req.body.saveToFile === true ? true : false
    };

    if (req.body?.margin) {
        // set the margin of the pdf if it is a number append px to it
        // otherwise just use the value
        pdfData.margin = {
            top: typeof req.body.margin.top === 'number' ? `${req.body.margin.top}px` : req.body.margin.top,
            right: typeof req.body.margin.right === 'number' ? `${req.body.margin.right}px` : req.body.margin.right,
            bottom: typeof req.body.margin.bottom === 'number' ? `${req.body.margin.bottom}px` : req.body.margin.bottom,
            left: typeof req.body.margin.left === 'number' ? `${req.body.margin.left}px` : req.body.margin.left
        }

    }

    if (req.body?.header) {
        pdfData.header = req.body.header;
    }

    if (req.body?.footer) {
        pdfData.footer = req.body.footer;
    }

    if (req.body?.landscape) {
        pdfData.landscape = req.body.landscape;
    }

    if (req.body?.format) {
        pdfData.format = req.body.format;
    }

    return pdfData;
}

function handlePDFRequest(res, pdfData, child) {
    if (!child) return
    if (!pdfData) return

    usePDFChildProcess(child, pdfData)
        .then((pdf) => {
            const pdfBuffer = Buffer.from(pdf, "binary")
            res.contentType("application/pdf");
            res.appendHeader('Content-Disposition', `inline; filename=johnspdf_dk_${Date.now()}.pdf`);
            res.send(pdfBuffer);
        })
        .catch((error) => {
            killChildProcess(child); // kill the child process if it fails
            console.error(error)
            res.status(400).send(error.message)
        });
}


// Function to find an available child process
function findAvailableChildProcess() {
    let child = children.find(child => child.isAvailable);

    if (!child && children.length < maxChildren) {
        child = createPDFChildProcess();
        children.push(child);
    }
    if (child) {
        child.isAvailable = false;
    }
    return child;
}

// Function to use a child process
function usePDFChildProcess(child, data) {
    if (!child) return Promise.reject(new Error('No child process available'));

    if (!data.html) return Promise.reject(new Error('No html provided'))

    return new Promise((resolve, reject) => {
        // Set the child as unavailable and update the last used timestamp
        child.lastUsed = Date.now();

        // Send the data to the child
        child.send(data);

        // Set up the child's response handlers
        child.onResponse = resolve;
        child.onError = reject;
    });
}

function createPDFChildProcess() {
    const child = fork(pdfGeneratorPath);
    child.isAvailable = false;
    child.lastUsed = Date.now();


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
        console.log(error)
        if (child.onError) {
            child.onError(error);
        }
    });

    return child;
}

// Function to terminate idle child processes
function terminateIdleChildrenProcesses() {
    const idleTime = 1000 * 60 * 5; // 5 minutes
    const now = Date.now();

    for (let i = children.length - 1; i >= 0; i--) {
        if (children.length < 2) return; // we always want to have at least 2 children running to avoid downtime

        const child = children[i];
        if (child.isAvailable && now - child.lastUsed > idleTime) {
            const timestamp = new Date();
            console.log(`${timestamp.toString()}: Terminating idle child process ${i} (${child.pid})`)
            killChildProcess(child)
        }
    }
}

function processQueue() {
    if (requestQueue.length == 0) return;

    const child = findAvailableChildProcess();

    if (!child) return;

    // If a child process is available, process the next request in the queue
    const { res, pdfData } = requestQueue.shift();

    try {
        handlePDFRequest(res, pdfData, child);
    } catch (error) {
        console.error('Error processing request:', error);
        // Optionally, add the request back to the queue for retry
        pushToQueue(res, pdfData);
    };
}

function logStatus() {
    const numChildren = children.length;
    const numAvailableChildren = children.filter(child => child.isAvailable).length;
    const numRequestsInQueue = requestQueue.length;
    const timestamp = new Date();

    console.log(`Status at ${timestamp}:`);
    console.log(`- Number of child processes: ${numChildren}`);
    console.log(`- Number of available child processes: ${numAvailableChildren}`);
    console.log(`- Number of requests in queue: ${numRequestsInQueue}`);
}

// Set an interval to terminate idle child processes every minute
setInterval(terminateIdleChildrenProcesses, 1000 * 60);
setInterval(processQueue, 100);
setInterval(logStatus, 5000);
