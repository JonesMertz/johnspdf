import * as fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

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
 * Creates a PDF using the provided PDFData object.
 *
 * @param {PDFData} pdfData - The PDFData object containing the data for the PDF.
 * @returns {Buffer} A buffer containing the PDF.
 */
process.on('message', async (pdfData) => {
    // Create a pdf from the html

    const pdf = await createPDF(pdfData)
    // Send a response back to the parent process
    process.send(pdf);
});

/**
 * Creates a PDF document based on the provided data.
 * @param {PDFData} pdfData - The PDFData object containing the data for the PDF.
 * @returns {Promise<Buffer>} - A promise that resolves to the generated PDF document.
 */
async function createPDF(pdfData) {

    // try to get available pdf generator if none availabe try again after 1 second

    const page = await getPage()
    await page.setContent(pdfData.html, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
        format: pdfData?.format || "A4",
        printBackground: false,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        landscape: pdfData?.landscape || false,
        headerTemplate: pdfData?.header || getHeaderTemplate(), // `<span style="font-size: 12px; width: 100%; height: 100px; background-color: black; color: white; margin: 20px;"><img width="100" src="data:image/png;base64, ${logo}" alt="company_logo"></span>`,
        footerTemplate: pdfData?.footer || getFooterTemplate(), //`<span style="font-size: 12px; width: 50px; height: 50px; background-color: red; color:black; margin: 20px;">Footer</span>`,
        //headerTemplate: `<div class="header">texsasras<img decoding="async" width="100" src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%200'%3E%3C/svg%3E" alt="company_logo" data-lazy-src="data:image/png;base64, ${logo}"><noscript><img decoding="async" width="100" src="data:image/png;base64, ${logo}" alt="company_logo"></noscript></div> `,
        //footerTemplate: '<footer><h5>Page <span class="pageNumber"></span> of <span class="totalPages"></span></h5></footer>',
        margin: {
            top: pdfData?.margin?.top || "140px",
            bottom: pdfData?.margin?.bottom || "80px",
            right: pdfData?.margin?.right || "20px",
            left: pdfData?.margin?.left || "20px"
        },
    });

    if (pdfData.saveToFile) {
        const fileName = (pdfData.fileName || Date.now().toString()) + ".pdf"
        const pdf_path = path.resolve(process.cwd(), fileName)
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

function getHeaderTemplate() {
    return ""
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

function getFooterTemplate() {
    return ""
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

process.on("SIGINT", async () => {
    const browser = await getBrowser();
    await browser.close();
    process.exit(0);
})