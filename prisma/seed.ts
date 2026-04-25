import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Sports Pavilion CRM database...\n");

  // ── Hash passwords ────────────────────────────────────
  const adminPassword = "admin123";
  const repPassword = "password123";
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const repHash = await bcrypt.hash(repPassword, 12);
  console.log(`  Password hashes generated`);

  // ── Create Users ──────────────────────────────────────
  console.log("\n  Creating users...");

  const users = await Promise.all(
    [
      {
        name: "Super Admin",
        email: "admin@spcrm.com",
        role: "SUPER_ADMIN",
        phone: "03001234567",
        password: adminHash,
      },
      {
        name: "Ahmed Manager",
        email: "manager@spcrm.com",
        role: "ADMIN",
        phone: "03009876543",
        password: adminHash,
      },
      {
        name: "Ali Khan",
        email: "ali@spcrm.com",
        role: "SALES_REP",
        phone: "03121234567",
        password: repHash,
      },
      {
        name: "Bilal Ahmed",
        email: "bilal@spcrm.com",
        role: "SALES_REP",
        phone: "03139876543",
        password: repHash,
      },
      {
        name: "Sara Tariq",
        email: "sara@spcrm.com",
        role: "SALES_REP",
        phone: "03211234567",
        password: repHash,
      },
      {
        name: "Omar Farooq",
        email: "omar@spcrm.com",
        role: "SALES_REP",
        phone: "03229876543",
        password: repHash,
      },
      {
        name: "Zain Malik",
        email: "zain@spcrm.com",
        role: "SALES_REP",
        phone: "03331234567",
        password: repHash,
      },
    ].map(async (u) => {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash: u.password },
        create: {
          name: u.name,
          email: u.email,
          phone: u.phone,
          passwordHash: u.password,
          role: u.role,
          isActive: true,
        },
      });
      console.log(`    ✅ ${u.role}: ${u.name} <${u.email}>`);
      return user;
    }),
  );

  // ── Create Sample Leads ───────────────────────────────
  console.log("\n  Creating sample leads...");

  const ali = users[2]; // ali@spcrm.com
  const bilal = users[3]; // bilal@spcrm.com
  const sara = users[4]; // sara@spcrm.com
  const omar = users[5]; // omar@spcrm.com
  const zain = users[6]; // zain@spcrm.com

  const sampleLeads = [
    {
      firstName: "Usman",
      lastName: "Hassan",
      phone: "03451234567",
      email: "usman@gmail.com",
      source: "META_AD",
      leadType: "MEMBERSHIP",
      temperature: "HOT",
      status: "INTERESTED",
      leadScore: 80,
      assignedRepId: ali.id,
      interestedFacilities: JSON.stringify(["Cricket", "Gym", "Swimming Pool"]),
      budgetRange: "15K_25K",
      remarks: "Called twice, very interested in annual family membership. Coming for a visit on Saturday.",
      tags: JSON.stringify(["family", "priority", "visit-scheduled"]),
    },
    {
      firstName: "Fatima",
      lastName: "Noor",
      phone: "03459876543",
      email: "fatima.noor@yahoo.com",
      source: "WHATSAPP",
      leadType: "DAY_PASS",
      temperature: "WARM",
      status: "CONTACTED",
      leadScore: 55,
      assignedRepId: bilal.id,
      interestedFacilities: JSON.stringify(["Tennis", "Swimming Pool"]),
      budgetRange: "UNDER_10K",
      remarks: "Inquired about day passes for weekend. Sent pricing details via WhatsApp.",
      tags: JSON.stringify(["day-pass", "weekend"]),
    },
    {
      firstName: "Hassan",
      lastName: "Raza",
      phone: "03461112223",
      email: null,
      source: "WALK_IN",
      leadType: "MEMBERSHIP",
      temperature: "HOT",
      status: "NEGOTIATION",
      leadScore: 90,
      assignedRepId: sara.id,
      interestedFacilities: JSON.stringify([
        "Gym",
        "Personal Trainer",
        "Swimming Pool",
      ]),
      budgetRange: "25K_50K",
      remarks:
        "Walk-in inquiry. Wants premium annual membership with PT sessions. Negotiating price.",
      tags: JSON.stringify(["premium", "walk-in", "high-value"]),
    },
    {
      firstName: "Ayesha",
      lastName: "Khan",
      phone: "03474445566",
      email: "ayesha.k@outlook.com",
      source: "INSTAGRAM",
      leadType: "CORPORATE",
      temperature: "COLD",
      status: "NEW",
      leadScore: 30,
      assignedRepId: omar.id,
      interestedFacilities: JSON.stringify([
        "Corporate Events",
        "Meeting Hall",
        "Cricket",
      ]),
      budgetRange: "50K_PLUS",
      remarks:
        "DM on Instagram asking about corporate event packages. Need to follow up with detailed proposal.",
      tags: JSON.stringify(["corporate", "instagram-lead"]),
    },
    {
      firstName: "Tariq",
      lastName: "Mahmood",
      phone: "03487778899",
      email: "tariq.m@gmail.com",
      source: "REFERRAL",
      leadType: "MEMBERSHIP",
      temperature: "WARM",
      status: "CONTACTED",
      leadScore: 60,
      assignedRepId: zain.id,
      interestedFacilities: JSON.stringify(["Cricket", "Football", "Gym"]),
      budgetRange: "10K_15K",
      remarks:
        "Referred by existing member Imran. Interested in monthly installment plan for individual membership.",
      tags: JSON.stringify(["referral", "installment-plan"]),
    },
  ];

  for (const leadData of sampleLeads) {
    const lead = await prisma.lead.create({
      data: leadData,
    });
    console.log(
      `    ✅ Lead: ${leadData.firstName} ${leadData.lastName} [${leadData.status}] → ${leadData.temperature} → ${users.find((u) => u.id === leadData.assignedRepId)?.email}`,
    );
  }

  // ── Create Sample Audit Logs ──────────────────────────
  console.log("\n  Creating sample audit logs...");

  // Fetch the first lead to reference in the audit log
  const firstLead = await prisma.lead.findFirst();

  await prisma.auditLog.createMany({
    data: [
      {
        actorType: "SYSTEM",
        actorName: "System",
        entityType: "LEAD",
        entityId: firstLead?.id ?? null,
        action: "CREATE",
        remarks: "Sample lead created via seed script",
      },
      {
        actorType: "SYSTEM",
        actorName: "System",
        entityType: "USER",
        entityId: null,
        action: "CREATE",
        remarks: "Sample users created via seed script",
      },
    ],
  });
  console.log("    ✅ 2 audit log entries created");

  console.log("\n✨ Seed completed successfully!");
  console.log(
    `\n📊 Summary: ${users.length} users, ${sampleLeads.length} leads created.\n`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
