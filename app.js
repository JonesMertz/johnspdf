const express = require('express');
const http = require('http');
const puppeteer = require('puppeteer')
const app = express();
const fs = require('fs');
const { get } = require('http');
const port = 3005;
const pdfGenerators = []
let browser = false
let page = false


/* const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });

    console.log(req)
    console.log(res)
    res.
    res.end(__dirname + '/index.html');
})

server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
}) */

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get("/pdf", (req, res) => {
    const html = fs.readFileSync('./test.html', 'utf8');
    createPDF(html).then(pdf => {
        res.contentType("application/pdf");
        res.send(pdf);
    })
});

function validatePDFRequest(req, res, next) {
    if (!req.query.html) {
        res.status(400).send("html query parameter is required")
    } else {
        next()
    }

}

/* setInterval(() => {
    // check for unused pdfGenerators and close them
    const maxIdleTime = Date.now() - 1000 * 60 * 5
    const pdfGeneratorsToClose = pdfGenerators.filter((pdfGenerator) => {
        const timeSpentIdle = Date.now() - pdfGenerator.lastUsed
        pdfGenerator.isAvailable && timeSpentIdle > maxIdleTime
    })

    pdfGeneratorsToClose.forEach((pdfGenerator) => {
        pdfGenerator.browser.close().then(() => {
            pdfGenerators.splice(pdfGenerators.indexOf(pdfGenerator), 1)
        })
    })
}, 1000 * 60)
 */
async function createPDFGenerator() {
    let isAvailable = true;
    let lastUsed = Date.now();
    if (!browser) {
        browser = await puppeteer.launch({ headless: "new" })
    }
    if (!page) {
        page = await browser.newPage();
    }

    function releaseForUse() {
        isAvailable = true;
    }

    function use() {
        if (!isAvailable) {
            throw new Error('Resource is not available');
        }
        isAvailable = false;
        lastUsed = Date.now();
    }

    function checkAvailability() {
        return isAvailable;
    }

    function getLastUsed() {
        return lastUsed;
    }

    return {
        browser: browser,
        page: page,
        isAvailable: true,
        lastUsed: getLastUsed,
        releaseForUse: releaseForUse,
        use: use,
        checkAvailability: checkAvailability
    }
}

async function getAvailablePDFgenerator() {
    if (pdfGenerators.length < 1) {
        const pdfGenerator = await createPDFGenerator()
        pdfGenerators.push(pdfGenerator)
    }
    let pdfGenerator = pdfGenerators.find(pdfGenerator => pdfGenerator.checkAvailability())
    if (!pdfGenerator) {
        return Promise.reject("No available pdf generators")
    } else {
        pdfGenerator.use()
    }
    return pdfGenerator
}

async function createPDF(html) {
    let logo = fs.readFileSync("./john-logo.png", { encoding: 'base64' })

    // try to get available pdf generator if none availabe try again after 1 second

    let pdfGenerator = await getAvailablePDFgenerator().catch(() => {
        return retry(getAvailablePDFgenerator, 1000)
    })
    await pdfGenerator.page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await pdfGenerator.page.pdf({
        format: "A4",
        printBackground: false,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        landscape: false,
        headerTemplate: getHeaderTemplate({ logo }), // `<span style="font-size: 12px; width: 100%; height: 100px; background-color: black; color: white; margin: 20px;"><img width="100" src="data:image/png;base64, ${logo}" alt="company_logo"></span>`,
        footerTemplate: getFooterTemplate({ logo }), //`<span style="font-size: 12px; width: 50px; height: 50px; background-color: red; color:black; margin: 20px;">Footer</span>`,
        //headerTemplate: `<div class="header">texsasras<img decoding="async" width="100" src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%200'%3E%3C/svg%3E" alt="company_logo" data-lazy-src="data:image/png;base64, ${logo}"><noscript><img decoding="async" width="100" src="data:image/png;base64, ${logo}" alt="company_logo"></noscript></div> `,
        //footerTemplate: '<footer><h5>Page <span class="pageNumber"></span> of <span class="totalPages"></span></h5></footer>',
        margin: {
            top: "140px",
            bottom: "80px",
            right: "20px",
            left: "20px"
        },
    });

    pdfGenerator.releaseForUse()
    return pdf
}

function getHeaderTemplate({ logo: logo }) {
    return `<style>
        html {
            -webkit-print-color-adjust: exact;
        }
        </style>

        <style>
            .header-table {
                font-size: 12px;
            }

            img {
                max-height: 80px;
                padding : 10px;
            }
        </style>

        <table class="header-table" style="width:100%;">
        <tr>
            <td style="text-align:right;">
                <img src="data:image/png;base64, ${logo}" alt="company_logo"></span>
            </td>
        </tr>
        </table>`;
}

function getFooterTemplate({
    logo: logo
}) {
    return `<style>
        html {
            -webkit-print-color-adjust: exact;
        }
        </style>

        <style>
            #header, #footer { padding: 0 !important; }
            .footer-table {
                font-size: 9px;
                text-align:center;

            }
        </style>

        <table class="footer-table" style="width:100%;">
        <tr>
        <td>
        <hr>
            <p>
                <b>TRACELINK TESTKONTO</b> - Danmark - CVR-nr.: 70261001<br>
                Tlf.: 21457783

                <br>
                Bank: Danske Bank
                – Kontonr. 0476 / 11111111 <br>
                <span class="pageNumber"></span> af <span class="totalPages"></span>
            </p>
        </td>
        </tr>
        </table>`;
}

function retry(fn, ms = 1000, maxRetries = 5) {
    new Promise((resolve, reject) => {
        let retries = 0;
        fn()
            .then(resolve)
            .catch(() => {
                setTimeout(() => {
                    console.log('retrying failed promise...');
                    ++retries;
                    if (retries == maxRetries) {
                        return reject('maximum retries exceeded');
                    }
                    retry(fn, ms).then(resolve);
                }, ms);
            })
    });
}
