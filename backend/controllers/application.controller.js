import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";

// Student - apply for a job
export const applyJob = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;

        if (!jobId) {
            return res.status(400).json({
                message: "Job id is required.",
                success: false
            });
        }

        // Check if job exists
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        // Check if user has already applied
        const existingApplication = await Application.findOne({
            job: jobId,
            applicant: userId
        });

        if (existingApplication) {
            return res.status(400).json({
                message: "You have already applied for this job.",
                success: false
            });
        }

        // Create application
        const newApplication = await Application.create({
            job: jobId,
            applicant: userId
        });

        // Add application to job
        job.applications.push(newApplication._id);
        await job.save();

        return res.status(201).json({
            message: "Job applied successfully.",
            success: true
        });

    } catch (error) {
        console.error("Apply job error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};


// Student - get all applied jobs
export const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.id;

        const applications = await Application.find({
            applicant: userId
        })
            .sort({ createdAt: -1 })
            .populate({
                path: "job",
                populate: {
                    path: "company"
                }
            });

        return res.status(200).json({
            applications,
            success: true
        });

    } catch (error) {
        console.error("Get applied jobs error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};


// Admin - get applicants for a job
export const getApplicants = async (req, res) => {
    try {
        const jobId = req.params.id;
        const adminId = req.id;

        // Find job and verify that logged-in admin created it
        const job = await Job.findOne({
            _id: jobId,
            created_by: adminId
        }).populate({
            path: "applications",
            options: {
                sort: {
                    createdAt: -1
                }
            },
            populate: {
                path: "applicant"
            }
        });

        if (!job) {
            return res.status(404).json({
                message: "Job not found or you don't have permission.",
                success: false
            });
        }

        return res.status(200).json({
            job,
            success: true
        });

    } catch (error) {
        console.error("Get applicants error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};


// Admin - update application status
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const applicationId = req.params.id;
        const adminId = req.id;

        if (!status) {
            return res.status(400).json({
                message: "Status is required.",
                success: false
            });
        }

        const allowedStatuses = [
            "pending",
            "accepted",
            "rejected"
        ];

        const normalizedStatus = status.toLowerCase();

        if (!allowedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                message: "Invalid application status.",
                success: false
            });
        }

        // Find application and verify that the logged-in admin
        // owns the job associated with this application
        const application = await Application.findById(applicationId)
            .populate("job");

        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
                success: false
            });
        }

        if (application.job.created_by.toString() !== adminId.toString()) {
            return res.status(403).json({
                message: "You are not authorized to update this application.",
                success: false
            });
        }

        // Update status
        application.status = normalizedStatus;
        await application.save();

        return res.status(200).json({
            message: "Status updated successfully.",
            success: true
        });

    } catch (error) {
        console.error("Update application status error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};