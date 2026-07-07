// src/app.js - trigger restart
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
// import "./config/firebase.js"

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import assetRoutes from "./routes/asset.routes.js";
import appControlRoutes from "./routes/appControl.routes.js";
import categoryRouter from './routes/category.routes.js'
import blogRouter from './routes/blog.routes.js'
import policyRouter from './routes/policy.routes.js'
import cityRouter from './routes/city.routes.js'
import serviceCategoryRouter from './routes/serviceCategory.routes.js'
import serviceSubcategoryRouter from './routes/serviceSubcategory.routes.js'
import serviceRouter from './routes/service.routes.js'
import customerRouter from './routes/customer.routes.js'
import customerAddressRouter from './routes/customerAddress.routes.js'
import serviceOrderRouter from './routes/serviceOrder.routes.js'
import localityRouter from './routes/locality.routes.js'
import projectRouter from './routes/project.routes.js'
import propertyRouter from './routes/property.routes.js'
import groupRouter from './routes/group.routes.js'
import enquiryRouter from './routes/enquiry.routes.js'

// import "./jobs/keepAlive.cron.js";

const app = express();

// --- Middleware ---
app.use(express.json({
  limit: "100mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://estind-dashboard.vercel.app/",
    "https://estind-website.vercel.app/"
    // "https://trevion.browndevs.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Your server is up and running smoothly....",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/app-controls", appControlRoutes);
app.use("/api/v1/asset", assetRoutes);
app.use("/api/v1/categories", categoryRouter)
app.use("/api/v1/policy", policyRouter)
app.use("/api/v1/blogs", blogRouter)
app.use("/api/v1/cities", cityRouter)
app.use("/api/v1/service-categories", serviceCategoryRouter)
app.use("/api/v1/service-subcategories", serviceSubcategoryRouter)
app.use("/api/v1/services", serviceRouter)
app.use("/api/v1/customers", customerRouter)
app.use("/api/v1/customers/addresses", customerAddressRouter)
app.use("/api/v1/orders/services", serviceOrderRouter)
app.use("/api/v1/localities", localityRouter)
app.use("/api/v1/projects", projectRouter)
app.use("/api/v1/properties", propertyRouter)
app.use("/api/v1/groups", groupRouter)
app.use("/api/v1/enquiries", enquiryRouter)

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  if (err.toJSON) {
    return res.status(err.statusCode || 500).json(err.toJSON());
  }

  return res.status(err.statusCode || 500).json({
    name: err.name || "Error",
    statusCode: err.statusCode || 500,
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || []
  });
});

export default app;



// these are commented from package.json files. these will be needed in future so I have commented them
// "firebase-admin": "^13.6.0",
// "googleapis": "^169.0.0",
// "handlebars": "^4.7.8",
// "@aws-sdk/client-s3": "^3.965.0",
// "@aws-sdk/s3-request-presigner": "^3.965.0",
// "csv-parse": "^6.1.0",
// "exceljs": "^4.4.0",