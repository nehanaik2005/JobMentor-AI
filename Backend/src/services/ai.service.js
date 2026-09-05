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

    technicalQuestions: z.array(z.object({
        question: z.string().describe(
            "The technical question that can be asked in the interview"
        ),
        intention: z.string().describe(
            "The intention of interviewer behind asking this question"
        ),
        answer: z.string().describe(
            "How to answer this question, what points to cover, what approach to take"
        )
    })),

    behavioralQuestions: z.array(z.object({
        question: z.string().describe(
            "The behavioral question that can be asked in the interview"
        ),
        intention: z.string().describe(
            "The intention of interviewer behind asking this question"
        ),
        answer: z.string().describe(
            "How to answer this question, what points to cover, what approach to take"
        )
    })),

    skillGaps: z.array(z.object({
        skill: z.string().describe(
            "The skill which the candidate is lacking"
        ),
        severity: z.enum(["low", "medium", "high"]).describe(
            "The severity of this skill gap"
        )
    })),

    preparationPlan: z.array(z.object({
        day: z.number().describe(
            "The day number in the preparation plan, starting from 1"
        ),
        focus: z.string().describe(
            "The main focus of this day"
        ),
        tasks: z.array(z.string()).describe(
            "List of tasks to be completed on this day"
        )
    })),

    title: z.string().describe(
        "The title of the job for which the interview report is generated"
    )
})


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
            responseSchema: zodToJsonSchema(
                interviewReportSchema
            )
        }
    })

    return JSON.parse(response.text)
}


async function generatePdfFromHtml(htmlContent) {

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    })

    const page = await browser.newPage()

    await page.setContent(
        htmlContent,
        {
            waitUntil: "networkidle0"
        }
    )

    const pdfBuffer = await page.pdf({
        format: "A4",

        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}


async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfSchema = z.object({
        html: z.string().describe(
            "The HTML content of the resume which can be converted to PDF using Puppeteer"
        )
    })


    const prompt = `
Generate a professional ATS-friendly resume for a candidate.

Candidate Resume:
${resume}

Candidate Self Description:
${selfDescription}

Job Description:
${jobDescription}

The response should contain HTML content for the resume.

The resume should:
- Be ATS friendly
- Be professional and simple
- Be 1-2 pages
- Highlight relevant skills
- Highlight relevant projects and experience
- Be tailored to the job description
- Sound human-written
`


    const response = await ai.models.generateContent({

        model: "gemini-3.6-flash",

        contents: prompt,

        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(
                resumePdfSchema
            )
        }
    })


    const jsonContent = JSON.parse(
        response.text
    )

    const pdfBuffer = await generatePdfFromHtml(
        jsonContent.html
    )

    return pdfBuffer
}


module.exports = {
    generateInterviewReport,
    generateResumePdf
}