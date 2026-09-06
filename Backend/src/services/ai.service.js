const { GoogleGenAI } = require("@google/genai")
const generatePdfFromHtml = require("../utils/generatePdf")

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})


// ==========================================
// GENERATE INTERVIEW REPORT
// ==========================================

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

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
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


// ==========================================
// GENERATE ATS RESUME PDF
// ==========================================

async function generateResumePdf({
    resume,
    jobDescription,
    selfDescription
}) {
    try {
        console.log("Starting AI resume generation...")

        const prompt = `
Create a professional, ATS-friendly resume in HTML format.

Use the following information:

RESUME:
${resume || "No resume provided"}

JOB DESCRIPTION:
${jobDescription || "No job description provided"}

SELF DESCRIPTION:
${selfDescription || "No self description provided"}

Requirements:
- Return ONLY valid HTML.
- Do not use Markdown.
- Do not include <html>, <head>, or <body> tags.
- Use clean professional styling.
- Make the resume suitable for a software developer/student.
- Include sections such as:
  - Name / Contact
  - Professional Summary
  - Skills
  - Education
  - Projects
  - Experience if available
  - Achievements
  - Certifications if available
- Keep the design simple and ATS-friendly.
- Tailor the resume toward the provided job description.
`

        console.log("Sending resume request to Gemini...")

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        })

        console.log("Gemini resume generation successful")

        const jsonContent = JSON.parse(response.text)

        if (!jsonContent.html) {
            throw new Error("Gemini returned empty HTML")
        }

        console.log("Generating PDF from HTML...")

        const pdfBuffer = await generatePdfFromHtml(
            jsonContent.html
        )

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


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    generateInterviewReport,
    generateResumePdf
}