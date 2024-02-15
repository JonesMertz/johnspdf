import bodyParser from "body-parser";
import { fork } from 'child_process';
import express from "express";
import * as fs from 'fs';
const app = express();
app.use(bodyParser.text({ type: 'text/html' }))
app.use(bodyParser.json())
app.use(express.static(process.cwd()))
const port = process.env.PDF_HANDLER_PORT || 5500;
const maxChildren = process.env.PDF_HANDLER_MAX_CHILDREN || 10;

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
    validateRequest(req, res);
    const pdfData = createPDFDataFromRequest(req);

    handlePDFRequest(res, pdfData);

    function validateRequest(req, res) {
        if (!req.body.html) {
            res.status(400).send("Missing required parameter: html");
        }
    }
});

/**
 * Creates PDF data from a request object.
 * @param {Object} req - The request object.
 * @returns {PDFData} - The PDF data.
 */
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
    /**
     * The PDF data object.
     * @typedef {Object} PDFData
     * @property {string} html - The HTML content of the PDF.
     * @property {boolean} saveToFile - Indicates whether to save the PDF to a file.
     * @property {Object} header - The header configuration of the PDF.
     * @property {string} header.html - The HTML content of the header.
     * @property {number} header.height - The height of the header.
     * @property {Object} footer - The footer configuration of the PDF.
     * @property {string} footer.html - The HTML content of the footer.
     * @property {number} footer.height - The height of the footer.
    */

    const html = req.body
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

function handlePDFRequest(res, html, retries = 5) {
    const child = findAvailableChildProcess();

    if (!child) {
        if (retries > 0) {
            // Wait for 1 second before retrying
            setTimeout(() => handlePDFRequest(res, html, retries - 1), 1000);
        } else {
            res.end("Service Unavailable");
        }
        return;
    }

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
}


// Function to find an available child process
function findAvailableChildProcess() {
    let child = children.find(child => child.isAvailable);

    if (!child && children.length < maxChildren) {
        child = createPDFChildProcess();
        children.push(child);
    }

    return child;
}

// Function to use a child process
function usePDFChildProcess(child, data) {
    return new Promise((resolve, reject) => {
        // Set the child as unavailable and update the last used timestamp
        child.isAvailable = false;
        child.lastUsed = Date.now();

        // Send the data to the child
        child.send(data);

        // Set up the child's response handlers
        child.onResponse = resolve;
        child.onError = reject;
    });
}

function createPDFChildProcess() {
    const child = fork('./create_pdf.js');
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

    if (children.length < 2) return; // we always want to have at least 2 children running to avoid downtime

    for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child.isAvailable && now - child.lastUsed > idleTime) {
            child.kill();
            children.splice(i, 1);
        }
    }
}

// Set an interval to terminate idle child processes every minute
setInterval(terminateIdleChildrenProcesses, 1000 * 60);

