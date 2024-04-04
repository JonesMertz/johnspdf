import * as fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const getBrowser = await (async function () {
    let browser = await puppeteer.launch({ headless: "new" })
    browser.on('disconnected', () => {

        browser = puppeteer.launch({ headless: "new" })
    })
    return function () {
        return browser;
    }
})();

const getPage = await (async function () {
    let browser = await getBrowser();
    let page = await browser.newPage();
    return function () {
        return page;
    }
})();



/**
 * @typedef {Object} processMessage
 * @property {BUFFER} pdf - The PDF buffer object containing the data for the PDF.
 * @property {Object} error - The error object.
 */

/**
 * Creates a PDF using the provided PDFData object.
 * @param {PDFData} pdfData - The PDFData object containing the data for the PDF.
 * @returns {processMessage} possibly with error and a buffer containing the PDF.
 */
process.on('message', async (pdfData) => {
    // Create a pdf from the html
    try {
        const pdf = await createPDF(pdfData)
        process.send({
            error: undefined,
            pdf: pdf
        });
    } catch (error) {
        process.send({
            error: error,
            pdf: undefined
        })
        console.error(error)
        process.exit(1)
    }
});

/**
 * Creates a PDF document based on the provided data.
 * @param {PDFData} pdfData - The PDFData object containing the data for the PDF.
 * @returns {Promise<Buffer>} - A promise that resolves to the generated PDF document.
 */
async function createPDF(pdfData) {

    // try to get available pdf generator if none availabe try again after 1 second

    const page = await getPage()
    const wrappedHTML = getHTMLWrapper(pdfData.html)
    await page.setContent(wrappedHTML, { waitUntil: 'domcontentloaded' })

    const marginTop = pdfData?.margin?.top || "0px"
    const marginLeft = pdfData?.margin?.left || "0px"
    const marginBottom = pdfData?.margin?.bottom || "0px"
    const marginRight = pdfData?.margin?.right || "0px"

    const pdf = await page.pdf({
        format: pdfData?.format || "A4",
        printBackground: false,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        printBackground: true,
        landscape: pdfData?.landscape || false,
        headerTemplate: getHeaderTemplate(pdfData?.header, marginTop), // `<span style="font-size: 12px; width: 100%; height: 100px; background-color: black; color: white; margin: 20px;"><img width="100" src="data:image/png;base64, ${logo}" alt="company_logo"></span>`,
        footerTemplate: getFooterTemplate(pdfData?.footer, marginBottom), //`<span style="font-size: 12px; width: 50px; height: 50px; background-color: red; color:black; margin: 20px;">Footer</span>`,
        //headerTemplate: `<div class="header">texsasras<img decoding="async" width="100" src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%200'%3E%3C/svg%3E" alt="company_logo" data-lazy-src="data:image/png;base64, ${logo}"><noscript><img decoding="async" width="100" src="data:image/png;base64, ${logo}" alt="company_logo"></noscript></div> `,
        //footerTemplate: '<footer><h5>Page <span class="pageNumber"></span> of <span class="totalPages"></span></h5></footer>',
        margin: {
            top: marginTop,
            bottom: marginBottom,
            right: marginRight,
            left: marginLeft
        },
    });

    if (pdfData.saveToFile) {
        const fileName = (pdfData.fileName || Date.now().toString()) + ".pdf"
        const pdf_path = path.resolve(__dirname, fileName)
        try {
            fs.writeFile(pdf_path, pdf, (err) => {
                if (err) throw err;
                console.log(`The file: ${fileName} has been saved!`);
            })
        } catch (error) {
            console.error(error)
        }
    }
    return pdf
}

function getHTMLWrapper(html) {
    const wrapper = `
    <style>
        
        body, html {
            padding: 0 !important;
            margin: 0 !important;
        }
    </style>
    <!DOCTYPE html>
    <html >
        <head>
            <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\">
        </head>
        <body>
            ${html}
        </body>
    </html>`
    return wrapper
}

function getHeaderTemplate(header, headerHeight) {
    if (!header) header = ""
    return `
        <style>
            #header { padding: 0 !important; }
            .header {
                -webkit-print-color-adjust: exact;
                padding: 0;
                max-height:${headerHeight};
            }
            .header img {
                max-height:${headerHeight};
                padding:0;
            }
        </style>
        <div class="header" style="width:100%;font-size: 12px;padding:0;">
            ${header}
        </div>`;
}
const header = '<style>#header, #footer { padding: 0 !important; }</style><div class="header" style="padding: 0 !important; margin: 0; -webkit-print-color-adjust: exact; background-color: red; color: white; width: 100%; text-align: left; font-size: 12px;">header of Juan<br /> Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
const footer = '<style>#header, #footer { padding: 0 !important; }</style><div class="footer" style="padding: 0 !important; margin: 0; -webkit-print-color-adjust: exact; background-color: blue; color: white; width: 100%; text-align: right; font-size: 12px;">footer of Juan<br /> Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';

function getFooterTemplate(footer, footerHeight) {
    if (!footer) footer = ""
    return `
        <style>
            #footer { padding: 0 !important; }
            .footer {
                -webkit-print-color-adjust: exact;
                padding: 0;
                max-height:${footerHeight};

            }
            .footer img {
                max-height:${footerHeight};
            }
        </style>

        <div class="footer" style="width:100%;font-size: 12px;padding:0;">
            ${footer}
        </div>`;
}

process.on("SIGINT", async () => {
    const browser = await getBrowser();
    await browser.close();
    process.exit(0);
})