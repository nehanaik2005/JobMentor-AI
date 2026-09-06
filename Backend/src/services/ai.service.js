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
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(
                    z.object({
                        html: z.string()
                    })
                )
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


module.exports = {
    generateInterviewReport,
    generateResumePdf
}