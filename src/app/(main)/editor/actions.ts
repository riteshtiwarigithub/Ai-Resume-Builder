"use server";

import prisma from "@/lib/prisma";
import { resumeSchema, ResumeValues } from "@/lib/validation";
import { auth } from "@clerk/nextjs/server";

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
  // ⭐ PHOTO HANDLING (NO BLOB)
  // -----------------------------
  let newPhotoUrl: string | null | undefined = existingResume?.photoUrl;

  if (photo instanceof File) {
    // Convert file → base64
    const buffer = Buffer.from(await photo.arrayBuffer());
    const base64 = `data:${photo.type};base64,${buffer.toString("base64")}`;
    newPhotoUrl = base64;
  } else if (photo === null) {
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
