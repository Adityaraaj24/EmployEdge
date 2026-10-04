import dns from "dns";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";

dotenv.config({});

// ✅ Force Node.js to use the correct DNS server
dns.setServers([ "10.123.72.80", "8.8.8.8", "1.1.1.1" ]);

console.log("DNS Servers:", dns.getServers());

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 3000;

console.log("Mongo URI ->", process.env.MONGO_URI);

// API
app.get("/", (req, res) => {
    console.log("Server is running");
    res.send("Server is running");
});

app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);

app.listen(PORT, async () => {
    try {
        await connectDB();
        console.log("✅ Database Connected");
    } catch (err) {
        console.error("❌ Database Connection Failed");
        console.error(err);
    }

    console.log(`🚀 Server running at port ${PORT}`);
});