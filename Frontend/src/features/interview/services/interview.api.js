import axios from "axios";

const api = axios.create({
    baseURL: "/",
    withCredentials: true,
})

/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {

    const formData = new FormData()

    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)

    if (resumeFile) {
        formData.append("resume", resumeFile)
    }

    const response = await api.post("/api/interview/", formData)

    return response.data
}