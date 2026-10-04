import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

// ==========================
// REGISTER
// ==========================
export const register = async (req, res) => {
    try {
        const {
            fullname,
            email,
            phoneNumber,
            password,
            role
        } = req.body;

        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists with this email.",
                success: false
            });
        }

        // File is optional/required depending on your registration form
        let profilePhoto = "";

        if (req.file) {
            const fileUri = getDataUri(req.file);

            if (!fileUri) {
                return res.status(400).json({
                    message: "Invalid file.",
                    success: false
                });
            }

            const cloudResponse = await cloudinary.uploader.upload(
                fileUri.content,
                {
                    resource_type: "auto"
                }
            );

            profilePhoto = cloudResponse.secure_url;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto
            }
        });

        return res.status(201).json({
            message: "Account created successfully.",
            success: true,
            user: {
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                profile: user.profile
            }
        });

    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};


// ==========================
// LOGIN
// ==========================
export const login = async (req, res) => {
    try {
        const {
            email,
            password,
            role
        } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                message: "Something is missing",
                success: false
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        // Check password
        const isPasswordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false
            });
        }

        // Check role
        if (role !== user.role) {
            return res.status(400).json({
                message: "Account doesn't exist with current role.",
                success: false
            });
        }

        // JWT payload
        const tokenData = {
            userId: user._id
        };

        const token = jwt.sign(
            tokenData,
            process.env.SECRET_KEY,
            {
                expiresIn: "1d"
            }
        );

        const userResponse = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res
            .status(200)
            .cookie("token", token, {
                maxAge: 1 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production"
            })
            .json({
                message: `Welcome back ${user.fullname}`,
                user: userResponse,
                success: true
            });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};


// ==========================
// LOGOUT
// ==========================
export const logout = async (req, res) => {
    try {
        return res
            .status(200)
            .cookie("token", "", {
                maxAge: 0,
                httpOnly: true,
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production"
            })
            .json({
                message: "Logged out successfully.",
                success: true
            });

    } catch (error) {
        console.error("Logout Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};


// ==========================
// UPDATE PROFILE
// ==========================
export const updateProfile = async (req, res) => {
    try {
        const {
            fullname,
            email,
            phoneNumber,
            bio,
            skills
        } = req.body;

        const userId = req.id;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized.",
                success: false
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            });
        }

        // Update basic fields
        if (fullname) {
            user.fullname = fullname;
        }

        if (email) {
            // Check whether another user already uses this email
            const existingUser = await User.findOne({
                email,
                _id: { $ne: userId }
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Email already exists.",
                    success: false
                });
            }

            user.email = email;
        }

        if (phoneNumber) {
            user.phoneNumber = phoneNumber;
        }

        // Make sure profile exists
        if (!user.profile) {
            user.profile = {};
        }

        if (bio !== undefined) {
            user.profile.bio = bio;
        }

        // Convert skills string into array
        if (skills !== undefined) {
            user.profile.skills = skills
                .split(",")
                .map(skill => skill.trim())
                .filter(skill => skill.length > 0);
        }

        // Upload resume only when file is provided
        if (req.file) {
            const fileUri = getDataUri(req.file);

            if (!fileUri) {
                return res.status(400).json({
                    message: "Invalid resume file.",
                    success: false
                });
            }

            const cloudResponse = await cloudinary.uploader.upload(
                fileUri.content,
                {
                    resource_type: "auto"
                }
            );

            user.profile.resume = cloudResponse.secure_url;
            user.profile.resumeOriginalName = req.file.originalname;
        }

        await user.save();

        const userResponse = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: userResponse,
            success: true
        });

    } catch (error) {
        console.error("Update Profile Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};