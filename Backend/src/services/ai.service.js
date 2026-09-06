async function generateResumePdf({ interviewReportId }) {
    try {
        console.log("Starting AI resume generation...")

        const interviewReport = await InterviewModel.findById(interviewReportId)

        if (!interviewReport) {
            throw new Error("Interview report not found")
        }

        const prompt = `
Create a professional, ATS-friendly resume in HTML format.

Use the following interview report information:

${JSON.stringify(interviewReport, null, 2)}

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

        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

        console.log("PDF generated successfully")

        return pdfBuffer

    } catch (error) {
        console.error("Resume PDF generation failed:", error)

        throw new Error(
            error.message || "Failed to generate resume PDF"
        )
    }
}