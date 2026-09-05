const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

// ===============================
// Gemini Configuration
// ===============================

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

// ===============================
// Interview Report Schema
// ===============================

const interviewReportSchema = z.object({
    matchScore: z.number().describe(
        "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
    ),

    technicalQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),

    behavioralQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),

    skillGaps: z.array(
        z.object({
            skill: z.string(),
            severity: z.enum(["low", "medium", "high"])
        })
    ),

    preparationPlan: z.array(
        z.object({
            day: z.number(),
            focus: z.string(),
            tasks: z.array(z.string())
        })
    ),

    title: z.string()
})

// ===============================
// Generate Interview Report
// ===============================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `
You are an expert technical interviewer and career coach.

Analyze the candidate's profile against the target job description.

Candidate Resume:
${resume || "No resume provided"}

Candidate Self Description:
${selfDescription || "No self description provided"}

Target Job Description:
${jobDescription}

Generate a detailed interview preparation report.

The report must include:

1. Match score between 0 and 100.
2. Technical interview questions with:
   - question
   - intention
   - ideal answer
3. Behavioral interview questions with:
   - question
   - intention
   - ideal answer
4. Skill gaps with severity:
   - low
   - medium
   - high
5. A day-by-day preparation plan.
6. A suitable title for the report.

Focus on the actual requirements of the job description.

Make the questions realistic for an entry-level software developer/internship candidate.

Return only the requested structured JSON.
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

// ===============================
// Generate PDF from HTML
// ===============================

async function generatePdfFromHtml(htmlContent) {

    console.log("Launching Puppeteer...")

    const chromePath = puppeteer.executablePath()

    console.log("Chrome executable path:")
    console.log(chromePath)

    const browser = await puppeteer.launch({
        headless: true,

        executablePath: chromePath,

        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote"
        ]
    })

    try {

        const page = await browser.newPage()

        await page.setContent(
            htmlContent,
            {
                waitUntil: "networkidle0"
            }
        )

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
// Generate Resume PDF
// ===============================

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfSchema = z.object({
        html: z.string().describe(
            "Complete HTML content for a professional ATS-friendly resume"
        )
    })

    const prompt = `
You are a professional resume writer.

Create a professional, ATS-friendly resume based on the candidate information and target job description.

Candidate Resume:
${resume || "No resume provided"}

Candidate Self Description:
${selfDescription || "No self description provided"}

Target Job Description:
${jobDescription}

Requirements:

- Create a professional resume.
- Make it suitable for a software developer/internship role.
- Make it ATS-friendly.
- Highlight skills relevant to the target job.
- Highlight projects and technical experience.
- Keep the formatting clean and professional.
- Use an A4-friendly layout.
- Do not include fake experience.
- Do not invent companies, degrees, certifications, achievements, or skills.
- Only use information available in the candidate information.
- Improve wording where appropriate.
- Make the resume concise and readable.

Return the complete resume as HTML.

The HTML must be self-contained.

Include CSS inside the HTML itself.

Do not use external CSS files.

Return only valid JSON matching the requested schema.
`

    let response = null

    const maxAttempts = 3

    // ===============================
    // Gemini Retry Logic
    // ===============================

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {

            console.log(
                `Gemini resume request attempt ${attempt}/${maxAttempts}`
            )

            response = await ai.models.generateContent({

                model: "gemini-3.6-flash",

                contents: prompt,

                config: {
                    responseMimeType: "application/json",

                    responseSchema: zodToJsonSchema(
                        resumePdfSchema
                    )
                }

            })

            console.log(
                "Gemini resume generation successful"
            )

            break

        } catch (error) {

            console.error(
                `Gemini resume attempt ${attempt} failed:`,
                error.message
            )

            if (attempt === maxAttempts) {
                throw error
            }

            await new Promise(
                resolve => setTimeout(resolve, 3000)
            )
        }
    }

    // ===============================
    // Validate Gemini Response
    // ===============================

    if (!response) {

        throw new Error(
            "Failed to generate resume from Gemini"
        )
    }

    const jsonContent = JSON.parse(
        response.text
    )

    if (!jsonContent.html) {

        throw new Error(
            "Gemini did not return resume HTML"
        )
    }

    console.log(
        "Generating PDF from HTML..."
    )

    // ===============================
    // Generate PDF
    // ===============================

    const pdfBuffer = await generatePdfFromHtml(
        jsonContent.html
    )

    console.log(
        "PDF generated successfully"
    )

    return pdfBuffer
}

// ===============================
// Export Services
// ===============================

module.exports = {
    generateInterviewReport,
    generateResumePdf
}