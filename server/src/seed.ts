import "dotenv/config";
import { connectDB } from "./db";
import { User, Team, Membership, Bug } from "./models";
import mongoose from "mongoose";

// Defines the four teams and their three members each. Running this
// script creates all of it in one go, instead of manually registering
// users and adding members one at a time through the UI or Thunder Client.
const TEAMS = [
  {
    name: "Mobile Team",
    key: "MOB",
    members: [
      { name: "Mobile Admin", email: "mobile-admin@example.com", role: "admin" as const },
      { name: "Mobile QA", email: "mobile-qa@example.com", role: "qa" as const },
      { name: "Mobile Dev", email: "mobile-dev@example.com", role: "developer" as const },
    ],
    sampleBug: { title: "App crashes on image upload", severity: "critical" as const },
  },
  {
    name: "FinTech Team",
    key: "FIN",
    members: [
      { name: "FinTech Admin", email: "fintech-admin@example.com", role: "admin" as const },
      { name: "FinTech QA", email: "fintech-qa@example.com", role: "qa" as const },
      { name: "FinTech Dev", email: "fintech-dev@example.com", role: "developer" as const },
    ],
    sampleBug: { title: "Incorrect balance after refund", severity: "high" as const },
  },
  {
    name: "Platform Team",
    key: "PLT",
    members: [
      { name: "Platform Admin", email: "platform-admin@example.com", role: "admin" as const },
      { name: "Platform QA", email: "platform-qa@example.com", role: "qa" as const },
      { name: "Platform Dev", email: "platform-dev@example.com", role: "developer" as const },
    ],
    sampleBug: { title: "API returns 500 on bulk export", severity: "medium" as const },
  },
  {
    name: "Growth Team",
    key: "GRW",
    members: [
      { name: "Growth Admin", email: "growth-admin@example.com", role: "admin" as const },
      { name: "Growth QA", email: "growth-qa@example.com", role: "qa" as const },
      { name: "Growth Dev", email: "growth-dev@example.com", role: "developer" as const },
    ],
    sampleBug: { title: "Signup form accepts invalid emails", severity: "low" as const },
  },
];

const PASSWORD = "password123";

async function run() {
  await connectDB();
  console.log("Seeding test data...\n");

  for (const teamDef of TEAMS) {
    // Create or reuse the team
    let team = await Team.findOne({ key: teamDef.key });
    if (!team) {
      // First member (always the admin in this list) becomes createdBy
      const firstUser = await getOrCreateUser(teamDef.members[0]);
      team = await Team.create({
        name: teamDef.name,
        key: teamDef.key,
        createdBy: firstUser._id,
      });
      console.log(`Created team: ${teamDef.name} (${teamDef.key})`);
    } else {
      console.log(`Team already exists: ${teamDef.name} (${teamDef.key})`);
    }

    // Create each user and their membership on this team
    for (const member of teamDef.members) {
      const user = await getOrCreateUser(member);

      const existingMembership = await Membership.findOne({
        team: team._id,
        user: user._id,
      });

      if (!existingMembership) {
        await Membership.create({
          team: team._id,
          user: user._id,
          role: member.role,
        });
        console.log(`  Added ${member.email} as ${member.role}`);
      } else {
        console.log(`  ${member.email} already a member`);
      }
    }

    // Add one sample bug per team, reported by that team's admin
    const existingBug = await Bug.findOne({
      team: team._id,
      title: teamDef.sampleBug.title,
    });

    if (!existingBug) {
      const admin = await User.findOne({ email: teamDef.members[0].email });
      await Bug.create({
        team: team._id,
        title: teamDef.sampleBug.title,
        severity: teamDef.sampleBug.severity,
        priority: "medium",
        reporter: admin!._id,
      });
      console.log(`  Created sample bug: "${teamDef.sampleBug.title}"`);
    }

    console.log("");
  }

  console.log("Done. All passwords are: " + PASSWORD);
  await mongoose.disconnect();
  process.exit(0);
}

// Finds a user by email, or creates them if they don't exist yet.
// Password hashing happens automatically via the User model's pre-save hook.
async function getOrCreateUser(def: { name: string; email: string }) {
  let user = await User.findOne({ email: def.email });
  if (!user) {
    user = await User.create({
      name: def.name,
      email: def.email,
      password: PASSWORD,
    });
  }
  return user;
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});