const { GoogleGenAI } = require("@google/genai")
const generatePdfFromHtml = require("../utils/generatePdf")

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})

// Helper function to handle retry with exponential backoff and valid fallback models
async function generateWithFallback(params, models = ["gemini-3.6-flash", "gemini-3.5-flash-lite"], retries = 3) {
    let lastError

    for (const model of models) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    ...params,
                    model: model
                })
                return response
            } catch (error) {
                lastError = error
                const isUnavailable = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE")
                
                if (isUnavailable && attempt < retries) {
                    const delay = Math.pow(2, attempt) * 1000 // Exponential delay: 2s, 4s...
                    console.warn(`Gemini 503 on ${model} (Attempt ${attempt}/${retries}). Retrying in ${delay}ms...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                } else {
                    console.warn(`Model ${model} failed on attempt ${attempt}: ${error.message || error}. Switching model if available...`)
                    break // Break retry loop to try next fallback model
                }
            }
        }
    }

    throw lastError
}

async function generateInterviewReport({
    resume,
    jobDescription,
    selfDescription
}) {
    try {
        console.log("Starting AI interview report generation...")

        const prompt = `
You are an expert technical interviewer and career coach.

Analyze the candidate information below and create a detailed interview preparation report.

RESUME:
${resume || "No resume provided"}

JOB DESCRIPTION:
${jobDescription || "No job description provided"}

SELF DESCRIPTION:
${selfDescription || "No self description provided"}

Create a JSON response containing:

{
    "candidateSummary": "Short summary of the candidate",
    "jobSummary": "Short summary of the target job",
    "skillMatch": {
        "matchedSkills": [],
        "missingSkills": [],
        "additionalSkillsToLearn": []
    },
    "strengths": [],
    "weaknesses": [],
    "skillGaps": [],
    "technicalQuestions": [
        {
            "question": "",
            "answer": "",
            "difficulty": ""
        }
    ],
    "behavioralQuestions": [
        {
            "question": "",
            "answer": ""
        }
    ],
    "projectQuestions": [
        {
            "question": "",
            "answer": ""
        }
    ],
    "preparationStrategy": [],
    "finalTips": []
}

Requirements:
- Analyze the resume against the job description.
- Identify matching and missing skills.
- Generate realistic technical interview questions.
- Generate behavioral interview questions.
- Generate questions about the candidate's projects.
- Provide useful answers to the questions.
- Make the questions appropriate for a software developer/student.
- Tailor everything to the provided job description.
- Return ONLY valid JSON.
- Do not use Markdown.
`

        console.log("Sending interview request to Gemini...")

        const response = await generateWithFallback({
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        })

        console.log("Gemini interview generation successful")

        const report = JSON.parse(response.text)

        return report

    } catch (error) {
        console.error(
            "Interview report generation failed:",
            error
        )

        throw new Error(
            error.message || "Failed to generate interview report"
        )
    }
}

async function generateResumePdf({
    resume,
    jobDescription,
    selfDescription
}) {
    try {
        console.log("Starting AI resume generation...")

        const prompt = `
Create a professional, ATS-friendly resume formatted as full clean HTML styled with inline CSS or standard <style> tags.

Candidate Info:
RESUME: ${resume || "No resume provided"}
JOB DESCRIPTION: ${jobDescription || "No job description provided"}
SELF DESCRIPTION: ${selfDescription || "No self description provided"}

Return a JSON object with a single key named "html" containing the full HTML string for the resume.
`

        console.log("Sending resume request to Gemini...")

        const response = await generateWithFallback({
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        html: { type: "STRING" }
                    },
                    required: ["html"]
                }
            }
        })

        console.log("Gemini resume generation successful")

        const jsonContent = JSON.parse(response.text)

        if (!jsonContent || !jsonContent.html) {
            throw new Error("Gemini returned empty HTML")
        }

        console.log("Generating PDF from HTML...")

        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

        console.log("PDF generated successfully")

        return pdfBuffer

    } catch (error) {
        console.error(
            "Resume PDF generation failed:",
            error
        )

        throw new Error(
            error.message || "Failed to generate resume PDF"
        )
    }
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
}