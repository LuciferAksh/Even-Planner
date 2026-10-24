import type { AiDraft, Brief } from "../../domain/schema";
export const brief: Brief = {
  title: "A lovely gathering",
  type: "wedding",
  date: "2027-02-20",
  location: "Jaipur",
  guests: 150,
  budget: 60000000,
  currency: "INR",
  preferences: "Vegetarian and step-free",
  timezone: "Asia/Kolkata",
};
export const draft: AiDraft = {
  tasks: Array.from({ length: 5 }, (_, i) => ({
    title: `Personalized task ${i}`,
    category: "Planning",
    daysBefore: i * 10,
  })),
  ideas: Array.from({ length: 3 }, (_, i) => ({
    title: `Idea ${i}`,
    description: "A thoughtful and practical idea",
    cost: "Low",
  })),
  assumptions: ["Confirm venue availability"],
  runOfShow: [
    { time: "10:00", title: "Setup" },
    { time: "11:00", title: "Welcome" },
    { time: "12:00", title: "Gathering" },
  ],
};
