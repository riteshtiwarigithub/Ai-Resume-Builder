"use server";

import prisma from "@/lib/prisma";
import { resumeSchema, ResumeValues } from "@/lib/validation";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";

export async function saveResume(values: ResumeValues) {
  const { id } = values;

  console.log("received values", values);

  const {
    photo,
    workExperiences,
    educations,
    projects,
    skillSet,
    courses,
    codingProfiles,
    custom,
    ...resumeValues
  } = resumeSchema.parse(values);

  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const existingResume = id
    ? await prisma.resume.findUnique({ where: { id, userId } })
    : null;

  if (id && !existingResume) {
    throw new Error("Resume not found");
  }

  // -----------------------------
  // ⭐ FIXED PHOTO HANDLING WITH VERCEL BLOB
  // -----------------------------
  let newPhotoUrl: string | null | undefined = existingResume?.photoUrl;

  if (photo instanceof File) {
    // Upload to Vercel Blob
    if (photo.size > 1024 * 1024 * 4) {
      throw new Error("File size must be less than 4MB");
    }

    const blob = await put(`resume-photos/${userId}-${Date.now()}-${photo.name}`, photo, {
      access: "public",
    });

    newPhotoUrl = blob.url;

    // Delete old photo if exists
    if (existingResume?.photoUrl) {
      try {
        const { del } = await import("@vercel/blob");
        await del(existingResume.photoUrl);
      } catch (error) {
        console.error("Failed to delete old photo:", error);
      }
    }
  } else if (photo === null) {
    // Delete photo if user removed it
    if (existingResume?.photoUrl) {
      try {
        const { del } = await import("@vercel/blob");
        await del(existingResume.photoUrl);
      } catch (error) {
        console.error("Failed to delete photo:", error);
      }
    }
    newPhotoUrl = null;
  }

  // -----------------------------
  // UPDATE RESUME
  // -----------------------------
  if (id) {
    return prisma.resume.update({
      where: { id },
      data: {
        ...resumeValues,
        photoUrl: newPhotoUrl,
        workExperiences: {
          deleteMany: {},
          create: workExperiences?.map((exp) => ({
            ...exp,
            startDate: exp.startDate ? new Date(exp.startDate) : undefined,
            endDate: exp.endDate ? new Date(exp.endDate) : undefined,
          })),
        },
        educations: {
          deleteMany: {},
          create: educations?.map((edu) => ({
            ...edu,
            startDate: edu.startDate ? new Date(edu.startDate) : undefined,
            endDate: edu.endDate ? new Date(edu.endDate) : undefined,
          })),
        },
        projects: {
          deleteMany: {},
          create: projects?.map((proj) => ({
            ...proj,
          })),
        },
        skillSet: {
          deleteMany: {},
          create: skillSet?.map((skill) => ({ ...skill })),
        },
        courses: {
          deleteMany: {},
          create: courses?.map((val) => ({ ...val })),
        },
        codingProfiles: {
          deleteMany: {},
          create: codingProfiles?.map((val) => ({ ...val })),
        },
        custom: {
          deleteMany: {},
          create: custom?.map((val) => ({ ...val })),
        },
        updatedAt: new Date(),
      },
    });
  }

  // -----------------------------
  // CREATE NEW RESUME
  // -----------------------------
  return prisma.resume.create({
    data: {
      ...resumeValues,
      userId,
      photoUrl: newPhotoUrl,
      workExperiences: {
        create: workExperiences?.map((exp) => ({
          ...exp,
          startDate: exp.startDate ? new Date(exp.startDate) : undefined,
          endDate: exp.endDate ? new Date(exp.endDate) : undefined,
        })),
      },
      educations: {
        create: educations?.map((edu) => ({
          ...edu,
          startDate: edu.startDate ? new Date(edu.startDate) : undefined,
          endDate: edu.endDate ? new Date(edu.endDate) : undefined,
        })),
      },
      projects: {
        create: projects?.map((proj) => ({
          ...proj,
        })),
      },
      skillSet: {
        create: skillSet?.map((skill) => ({ ...skill })),
      },
      courses: {
        create: courses?.map((val) => ({ ...val })),
      },
      codingProfiles: {
        create: codingProfiles?.map((val) => ({ ...val })),
      },
      custom: {
        create: custom?.map((val) => ({ ...val })),
      },
    },
  });
}