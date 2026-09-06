const puppeteer = require("puppeteer")

async function generatePdfFromHtml(html) {
    let browser

    try {
        console.log("Launching Puppeteer...")

        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        })

        console.log("Puppeteer launched successfully")

        const page = await browser.newPage()

        await page.setContent(html, {
            waitUntil: "networkidle0"
        })

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "15mm",
                right: "15mm",
                bottom: "15mm",
                left: "15mm"
            }
        })

        console.log("PDF created successfully")

        return pdfBuffer

    } catch (error) {

        console.error("PDF generation failed:", error)

        throw new Error("Failed to generate PDF")

    } finally {

        if (browser) {
            await browser.close()
        }
    }
}

module.exports = generatePdfFromHtml