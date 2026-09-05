const mongoose = require("mongoose");

async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("Connected to Database");
    } catch (err) {
        console.error("MongoDB Connection Error:", err.message);
    }
}

module.exports = connectToDB;