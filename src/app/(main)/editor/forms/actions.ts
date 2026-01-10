"use server";

import { groq } from "@/lib/groq";

// USE THIS MODEL (latest working — NOT deprecated)
const MODEL = "llama-3.1-8b-instant";

import {
  GenerateProjectInput,
  generateProjectSchema,
  GenerateSummaryInput,
  generateSummarySchema,
  GenerateWorkExperienceInput,
  generateWorkExperienceSchema,
} from "@/lib/validation";

import { Projects } from "@prisma/client";

// ---------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------
export async function generateSummary(input: GenerateSummaryInput) {
  const { jobTitle, workExperiences, educations, skillSet } =
    generateSummarySchema.parse(input);

  const systemMessage = `
    You are an expert resume writer AI.
    Generate a crisp, professional, ATS-friendly summary.
    Return ONLY the summary. No headings or disclaimers.
  `;

  const userMessage = `
    Job Title: ${jobTitle}

    Work Experience:
    ${workExperiences
      ?.map(
        (exp) => `• ${exp.position} at ${exp.company} (${exp.startDate} - ${
          exp.endDate || "Present"
        })`
      )
      .join("\n")}

    Education:
    ${educations
      ?.map((e) => `• ${e.degree} at ${e.school} (${e.startDate} - ${e.endDate})`)
      .join("\n")}

    Skills:
    ${skillSet
      ?.map(
        (s) =>
          `• Languages: ${s.languages}, Frameworks: ${s.frameworks}, Tools: ${s.tools}`
      )
      .join("\n")}
  `;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    max_tokens: 200,
  });

  return completion.choices[0].message.content?.trim() || "";
}

// ---------------------------------------------------------
// WORK EXPERIENCE
// ---------------------------------------------------------
export async function generateWorkExperience(
  input: GenerateWorkExperienceInput
) {
  const { description } = generateWorkExperienceSchema.parse(input);

  const systemMessage = `
    You are a resume AI. Convert the user's text into a structured work experience.
    Follow EXACT output format:

    Job title: <title>
    Company: <company>
    Company Location: <location>
    Start date: <YYYY-MM-DD>
    End date: <YYYY-MM-DD or Present>
    Description:
    • Bullet 1
    • Bullet 2
    • Bullet 3
  `;

  const userMessage = `Input: ${description}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    max_tokens: 300,
  });

  const res = completion.choices[0].message.content || "";

  return {
    position: res.match(/Job title: (.*)/)?.[1] || "",
    company: res.match(/Company: (.*)/)?.[1] || "",
    companyLocation: res.match(/Company Location: (.*)/)?.[1]?.trim() || "",
    description: (res.match(/Description:([\s\S]*)/)?.[1] || "").trim(),
    startDate: res.match(/Start date: (.*)/)?.[1] || "",
    endDate: res.match(/End date: (.*)/)?.[1] || "",
  };
}

// ---------------------------------------------------------
// PROJECT
// ---------------------------------------------------------
export async function generateProject(input: GenerateProjectInput) {
  const { description } = generateProjectSchema.parse(input);

  const systemMessage = `
    You are a resume project generator AI.
    FOLLOW EXACT FORMAT:

    Project Name: <name>
    Project Link: <link>
    TechStack: <stack>
    Description:
    • Bullet 1
    • Bullet 2
    • Bullet 3
  `;

  const userMessage = `Project details: ${description}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    max_tokens: 300,
  });

  const res = completion.choices[0].message.content || "";

  return {
    id: "",
    resumeId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    projectName: res.match(/Project Name: (.*)/)?.[1] || "",
    link: res.match(/Project Link: (.*)/)?.[1] || "",
    techStack: res.match(/TechStack: (.*)/)?.[1] || "",
    description: (res.match(/Description:([\s\S]*)/)?.[1] || "").trim(),
  } satisfies Projects;
}
