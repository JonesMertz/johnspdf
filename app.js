const express = require('express');
const puppeteer = require('puppeteer')
const app = express();
const fs = require('fs');
const port = 3005;
const pdfGenerators = []

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

app.get("/pdf", (req, res) => {
    const html = fs.readFileSync('./test.html', 'utf8');
    createPDF(html).then(pdf => {
        res.contentType("application/pdf");
        res.send(pdf);
    })

});

setInterval(() => {
    // check for unused pdfGenerators and close them
    const maxIdleTime = Date.now() - 1000 * 60 * 5
    const pdfGeneratorsToClose = pdfGenerators.filter((pdfGenerator) => {
        const timeSpentIdle = Date.now() - pdfGenerator.lastUsed
        pdfGenerator.isAvailable && timeSpentIdle > maxIdleTime
    })

    pdfGeneratorsToClose.forEach(async (pdfGenerator) => {
        await pdfGenerator.browser.close()
        pdfGenerators.splice(pdfGenerators.indexOf(pdfGenerator), 1)
    })

    pdfGenerators.filter(pdfGenerator => pdfGenerator.isAvailable && Date.now() - pdfGenerator.lastUsed > 1000 * 60 * 5).forEach(async pdfGenerator => {
        await pdfGenerator.browser.close()
        pdfGenerators.splice(pdfGenerators.indexOf(pdfGenerator), 1)
    })
}, 1000 * 60)

async function createPDFGenerator() {
    const browser = await puppeteer.launch({ headless: "new" });
    let page = await browser.newPage();
    return {
        browser: browser,
        page: page,
        isAvailable: true,
        lastUsed: Date.now(),
        releaseForUse: async () => {
            page = await browser.newPage()
            this.isAvailable = true
        }
    }
}

async function getAvailablePDFgenerator() {
    let pdfGenerator = pdfGenerators.find(pg => pg.isAvailable)
    if (!pdfGenerator) {
        pdfGenerator = await createPDFGenerator()
        pdfGenerators.push(pdfGenerator)
    } else {
        pdfGenerator.isAvailable = false
        pdfGenerator.lastUsed = Date.now()
    }
    return pdfGenerator
}

async function createPDF(html) {
    let logo = fs.readFileSync("./john-logo.png", { encoding: 'base64' })

    let { page, releaseForUse } = await getAvailablePDFgenerator();
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
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
    releaseForUse()
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

console.log(`Server is running on port ${port}`);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
