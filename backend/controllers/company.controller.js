import { Company } from "../models/company.model.js";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

// Register Company
export const registerCompany = async (req, res) => {
    try {
        const { companyName } = req.body;

        if (!companyName) {
            return res.status(400).json({
                message: "Company name is required.",
                success: false,
            });
        }

        const existingCompany = await Company.findOne({
            name: companyName,
        });

        if (existingCompany) {
            return res.status(400).json({
                message: "You can't register the same company.",
                success: false,
            });
        }

        const company = await Company.create({
            name: companyName,
            userId: req.id,
        });

        return res.status(201).json({
            message: "Company registered successfully.",
            company,
            success: true,
        });
    } catch (error) {
        console.error("Register company error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false,
        });
    }
};

// Get all companies of logged-in user
export const getCompany = async (req, res) => {
    try {
        const userId = req.id;

        const companies = await Company.find({ userId });

        return res.status(200).json({
            companies,
            success: true,
        });
    } catch (error) {
        console.error("Get companies error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false,
        });
    }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
    try {
        const companyId = req.params.id;

        const company = await Company.findById(companyId);

        if (!company) {
            return res.status(404).json({
                message: "Company not found.",
                success: false,
            });
        }

        return res.status(200).json({
            company,
            success: true,
        });
    } catch (error) {
        console.error("Get company by ID error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false,
        });
    }
};

// Update Company
export const updateCompany = async (req, res) => {
    try {
        const { name, description, website, location } = req.body;

        const updateData = {
            name,
            description,
            website,
            location,
        };

        // Only upload logo if a new file was provided
        if (req.file) {
            const fileUri = getDataUri(req.file);

            const cloudResponse = await cloudinary.uploader.upload(
                fileUri.content
            );

            updateData.logo = cloudResponse.secure_url;
        }

        const company = await Company.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!company) {
            return res.status(404).json({
                message: "Company not found.",
                success: false,
            });
        }

        return res.status(200).json({
            message: "Company information updated successfully.",
            company,
            success: true,
        });
    } catch (error) {
        console.error("Update company error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false,
        });
    }
};

