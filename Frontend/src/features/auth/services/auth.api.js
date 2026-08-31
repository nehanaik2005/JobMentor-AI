import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

// =====================
// REGISTER
// =====================
export async function register({ username, email, password }) {
    try {
        const response = await api.post("/api/auth/register", {
            username,
            email,
            password,
        });

        console.log("REGISTER SUCCESS:", response.data);
        return response.data;
    } catch (err) {
        console.error(
            "REGISTER ERROR:",
            err.response?.data || err.message
        );

        throw err;
    }
}

// =====================
// LOGIN
// =====================
export async function login({ email, password }) {
    try {
        const response = await api.post("/api/auth/login", {
            email,
            password,
        });

        console.log("LOGIN SUCCESS:", response.data);
        return response.data;
    } catch (err) {
        console.error(
            "LOGIN ERROR:",
            err.response?.data || err.message
        );

        throw err;
    }
}

// =====================
// LOGOUT
// =====================
export async function logout() {
    try {
        const response = await api.get("/api/auth/logout");

        console.log("LOGOUT SUCCESS:", response.data);
        return response.data;
    } catch (err) {
        console.error(
            "LOGOUT ERROR:",
            err.response?.data || err.message
        );

        throw err;
    }
}

// =====================
// GET CURRENT USER
// =====================
export async function getMe() {
    try {
        const response = await api.get("/api/auth/get-me");

        console.log("GET ME SUCCESS:", response.data);
        return response.data;
    } catch (err) {
        console.error(
            "GET ME ERROR:",
            err.response?.data || err.message
        );

        throw err;
    }
}

export default api;