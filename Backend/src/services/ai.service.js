const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const generatePdfFromHtml = require("../utils/generatePdf")


// ===============================
// Gemini Configuration
// ===============================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})


// ===============================
// Generate Interview Report
// ===============================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const interviewReportSchema = z.object({

        summary: z.string(),

        technicalQuestions: z.array(
            z.object({
                question: z.string(),
                answer: z.string()
            })
        ),

        behavioralQuestions: z.array(
            z.object({
                question: z.string(),
                answer: z.string()
            })
        ),

        skillGaps: z.array(
            z.object({
                skill: z.string(),
                reason: z.string(),
                recommendation: z.string()
            })
        ),

        preparationPlan: z.array(
            z.object({
                topic: z.string(),
                action: z.string()
            })
        )
    })


    const prompt = `
You are an expert technical interviewer and career coach.

Analyze the candidate's profile against the target job description and create a personalized interview preparation strategy.

Candidate Resume:
${resume || "No resume provided"}

Candidate Self Description:
${selfDescription || "No self description provided"}

Target Job Description:
${jobDescription}

Your task is to:

1. Analyze the candidate's background.
2. Compare the candidate's skills with the job requirements.
3. Identify important skill gaps.
4. Generate technical interview questions relevant to the target role.
5. Generate behavioral interview questions.
6. Provide strong sample answers appropriate for the candidate.
7. Create a practical preparation plan.

Important rules:

- Do not invent experience.
- Do not invent companies.
- Do not invent projects.
- Do not invent certifications.
- Do not claim that the candidate has a skill if it is not present in the provided information.
- Questions should be relevant to the target job.
- Technical questions should match the candidate's current level.
- Behavioral answers should be realistic and should not contain fake achievements.
- Skill gaps should be based on the target job requirements.
- Preparation recommendations should be practical.
- Keep the answers concise but useful.

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
                `Gemini interview request attempt ${attempt}/${maxAttempts}`
            )


            response = await ai.models.generateContent({

                model: "gemini-3.6-flash",

                contents: prompt,

                config: {

                    responseMimeType: "application/json",

                    responseSchema: zodToJsonSchema(
                        interviewReportSchema
                    )

                }

            })


            console.log(
                "Gemini interview report generation successful"
            )

            break


        } catch (error) {

            console.error(
                `Gemini interview attempt ${attempt} failed:`,
                error.message
            )


            const errorMessage =
                error.message || ""


            // ===============================
            // DO NOT RETRY QUOTA ERRORS
            // ===============================

            if (
                errorMessage.includes("429") ||
                errorMessage.includes("quota") ||
                errorMessage.includes("RESOURCE_EXHAUSTED")
            ) {

                throw new Error(
                    "Gemini API quota exceeded. Please try again after the quota resets or check your Gemini API billing/plan."
                )

            }


            // ===============================
            // Retry temporary 503 errors
            // ===============================

            if (
                errorMessage.includes("503") ||
                errorMessage.includes("UNAVAILABLE") ||
                errorMessage.includes("high demand")
            ) {

                if (attempt < maxAttempts) {

                    console.log(
                        "Gemini is temporarily unavailable. Retrying in 5 seconds..."
                    )

                    await new Promise(
                        resolve =>
                            setTimeout(resolve, 5000)
                    )

                    continue
                }

            }


            throw error
        }
    }


    // ===============================
    // Validate Response
    // ===============================

    if (!response) {

        throw new Error(
            "Failed to generate interview report from Gemini"
        )
    }


    let jsonContent

    try {

        jsonContent = JSON.parse(
            response.text
        )

    } catch (error) {

        console.error(
            "Invalid Gemini JSON response:",
            response.text
        )

        throw new Error(
            "Gemini returned an invalid interview report"
        )
    }


    // ===============================
    // Validate Required Fields
    // ===============================

    const validatedReport =
        interviewReportSchema.parse(
            jsonContent
        )


    return validatedReport
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


            const errorMessage =
                error.message || ""


            // ===============================
            // DO NOT RETRY QUOTA ERRORS
            // ===============================

            if (
                errorMessage.includes("429") ||
                errorMessage.includes("quota") ||
                errorMessage.includes("RESOURCE_EXHAUSTED")
            ) {

                throw new Error(
                    "Gemini API quota exceeded. Please try again after the quota resets or check your Gemini API billing/plan."
                )

            }


            // ===============================
            // Retry temporary 503 errors
            // ===============================

            if (
                errorMessage.includes("503") ||
                errorMessage.includes("UNAVAILABLE") ||
                errorMessage.includes("high demand")
            ) {

                if (attempt < maxAttempts) {

                    console.log(
                        "Gemini is temporarily unavailable. Retrying in 5 seconds..."
                    )

                    await new Promise(
                        resolve =>
                            setTimeout(resolve, 5000)
                    )

                    continue
                }

            }


            throw error
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


    let jsonContent

    try {

        jsonContent = JSON.parse(
            response.text
        )

    } catch (error) {

        console.error(
            "Invalid Gemini resume JSON response:",
            response.text
        )

        throw new Error(
            "Gemini returned an invalid resume response"
        )
    }


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

    const pdfBuffer =
        await generatePdfFromHtml(
            jsonContent.html
        )


    console.log(
        "PDF generated successfully"
    )


    return pdfBuffer
}



// ===============================
// Exports
// ===============================

module.exports = {
    generateInterviewReport,
    generateResumePdf
}