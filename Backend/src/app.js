const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const path = require("path")

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://jobmentor-ai.onrender.com"
    ],
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

/* Serve React frontend */
const frontendPath = path.join(__dirname, "../../Frontend/dist")

app.use(express.static(frontendPath))

/* React fallback */
app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
        return res.sendFile(path.join(frontendPath, "index.html"))
    }

    next()
})

module.exports = app