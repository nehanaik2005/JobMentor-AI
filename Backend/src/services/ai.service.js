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

            // ===============================
            // DO NOT RETRY QUOTA ERRORS
            // ===============================

            const errorMessage = error.message || ""

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
                        resolve => setTimeout(resolve, 5000)
                    )

                    continue
                }
            }

            // ===============================
            // Other errors
            // ===============================

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
module.exports = {
    generateInterviewReport,
    generateResumePdf
}