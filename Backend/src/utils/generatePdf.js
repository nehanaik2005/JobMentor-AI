const puppeteer = require("puppeteer")

async function generatePdfFromHtml(htmlContent) {
    let browser

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        })

        const page = await browser.newPage()
        await page.setContent(htmlContent, { waitUntil: "networkidle0" })

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" }
        })

        return pdfBuffer
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}

module.exports = generatePdfFromHtml