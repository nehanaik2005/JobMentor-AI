const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const interviewReportSchema = z.object({
    matchScore: z.number().describe(
        "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
    ),

    technicalQuestions: z.array(
        z.object({
            question: z.string().describe(
                "The technical question that can be asked in the interview"
            ),
            intention: z.string().describe(
                "The intention of interviewer behind asking this question"
            ),
            answer: z.string().describe(
                "How to answer this question, what points to cover, what approach to take"
            )
        })
    ),

    behavioralQuestions: z.array(
        z.object({
            question: z.string().describe(
                "The behavioral question that can be asked in the interview"
            ),
            intention: z.string().describe(
                "The intention of interviewer behind asking this question"
            ),
            answer: z.string().describe(
                "How to answer this question, what points to cover, what approach to take"
            )
        })
    ),

    skillGaps: z.array(
        z.object({
            skill: z.string().describe(
                "The skill which the candidate is lacking"
            ),
            severity: z.enum(["low", "medium", "high"]).describe(
                "The severity of this skill gap"
            )
        })
    ),

    preparationPlan: z.array(
        z.object({
            day: z.number().describe(
                "The day number in the preparation plan, starting from 1"
            ),
            focus: z.string().describe(
                "The main focus of this day"
            ),
            tasks: z.array(z.string()).describe(
                "List of tasks to be completed on this day"
            )
        })
    ),

    title: z.string().describe(
        "The title of the job for which the interview report is generated"
    )
})


// ===============================
// GENERATE INTERVIEW REPORT
// ===============================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `
Generate an interview preparation report for a candidate.

Candidate Resume:
${resume}

Candidate Self Description:
${selfDescription}

Job Description:
${jobDescription}

Analyze the candidate against the job description.

Provide:
1. Match score
2. Technical interview questions
3. Behavioral interview questions
4. Skill gaps
5. A day-wise preparation plan
6. Job title
`

    const response = await ai.models.generateContent({

        model: "gemini-3.6-flash",

        contents: prompt,

        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema)
        }
    })

    return JSON.parse(response.text)
}


// ===============================
// GENERATE PDF FROM HTML
// ===============================

async function generatePdfFromHtml(htmlContent) {

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    })

    try {

        const page = await browser.newPage()

        await page.setContent(htmlContent, {
            waitUntil: "networkidle0"
        })

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,

            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        })

        return pdfBuffer

    } finally {

        await browser.close()
    }
}


// ===============================
// GENERATE RESUME PDF
// ===============================

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfSchema = z.object({
        html: z.string().describe(
            "Complete HTML content for a professional resume"
        )
    })

    const prompt = `
Generate a professional ATS-friendly resume for a candidate.

Candidate Resume:
${resume}

Candidate Self Description:
${selfDescription}

Target Job Description:
${jobDescription}

Return a JSON object containing one field named "html".

The html field must contain a complete HTML document for the resume.

Requirements:
- Professional and simple design
- ATS-friendly content
- Tailored to the target job
- Highlight relevant skills
- Highlight relevant projects and experience
- Sound human-written
- Maximum 1-2 pages
`

    let response = null
    const maxAttempts = 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        try {

            console.log(
                `Gemini resume request attempt ${attempt}/${maxAttempts}`
            )

            response = await ai.models.generateContent({

                model: "gemini-3.6-flash",

                contents: prompt,

                config: {
                    responseMimeType: "application/json",
                    responseSchema: zodToJsonSchema(resumePdfSchema)
                }
            })

            console.log("Gemini resume generation successful")

            break

        } catch (error) {

            console.error(
                `Gemini resume attempt ${attempt} failed:`,
                error.message
            )

            if (attempt === maxAttempts) {
                throw error
            }

            // Wait 3 seconds before retrying
            await new Promise(resolve =>
                setTimeout(resolve, 3000)
            )
        }
    }

    if (!response) {
        throw new Error("Failed to generate resume from Gemini")
    }

    const jsonContent = JSON.parse(response.text)

    if (!jsonContent.html) {
        throw new Error("Gemini did not return resume HTML")
    }

    console.log("Generating PDF from HTML...")

    const pdfBuffer = await generatePdfFromHtml(
        jsonContent.html
    )

    console.log("PDF generated successfully")

    return pdfBuffer
}


module.exports = {
    generateInterviewReport,
    generateResumePdf
}