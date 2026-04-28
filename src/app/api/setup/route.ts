import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      await prisma.$disconnect();
      return NextResponse.json({ message: "Database already seeded", userCount: existingUsers });
    }

    const adminHash = await bcrypt.hash("admin123", 12);
    const managerHash = await bcrypt.hash("manager123", 12);
    const repHash = await bcrypt.hash("password123", 12);

    const users = await Promise.all([
      prisma.user.create({ data: { name: "Super Admin", email: "admin@spcrm.com", role: "SUPER_ADMIN", phone: "03001234567", passwordHash: adminHash, isActive: true } }),
      prisma.user.create({ data: { name: "Ahmed Manager", email: "manager@spcrm.com", role: "ADMIN", phone: "03009876543", passwordHash: managerHash, isActive: true } }),
      prisma.user.create({ data: { name: "Ali Khan", email: "ali@spcrm.com", role: "SALES_REP", phone: "03121234567", passwordHash: repHash, isActive: true } }),
      prisma.user.create({ data: { name: "Bilal Ahmed", email: "bilal@spcrm.com", role: "SALES_REP", phone: "03139876543", passwordHash: repHash, isActive: true } }),
      prisma.user.create({ data: { name: "Sara Tariq", email: "sara@spcrm.com", role: "SALES_REP", phone: "03211234567", passwordHash: repHash, isActive: true } }),
      prisma.user.create({ data: { name: "Omar Farooq", email: "omar@spcrm.com", role: "SALES_REP", phone: "03229876543", passwordHash: repHash, isActive: true } }),
      prisma.user.create({ data: { name: "Zain Malik", email: "zain@spcrm.com", role: "SALES_REP", phone: "03331234567", passwordHash: repHash, isActive: true } }),
    ]);

    const leads = [
      { firstName: "Usman", lastName: "Hassan", phone: "03451234567", email: "usman@gmail.com", source: "META_AD", leadType: "MEMBERSHIP", temperature: "HOT", status: "INTERESTED", leadScore: 80, assignedRepId: users[2].id, interestedFacilities: '["Cricket","Gym","Swimming Pool"]', budgetRange: "15K_25K", remarks: "Called twice, very interested in annual family membership.", tags: '["family","priority"]' },
      { firstName: "Fatima", lastName: "Noor", phone: "03459876543", email: "fatima.noor@yahoo.com", source: "WHATSAPP", leadType: "DAY_PASS", temperature: "WARM", status: "CONTACTED", leadScore: 55, assignedRepId: users[3].id, interestedFacilities: '["Tennis","Swimming Pool"]', budgetRange: "UNDER_10K", remarks: "Inquired about day passes for weekend.", tags: '["day-pass"]' },
      { firstName: "Hassan", lastName: "Raza", phone: "03461112223", source: "WALK_IN", leadType: "MEMBERSHIP", temperature: "HOT", status: "NEGOTIATION", leadScore: 90, assignedRepId: users[4].id, interestedFacilities: '["Gym","Personal Trainer"]', budgetRange: "25K_50K", remarks: "Walk-in inquiry. Wants premium membership.", tags: '["premium","walk-in"]' },
      { firstName: "Ayesha", lastName: "Khan", phone: "03474445566", email: "ayesha.k@outlook.com", source: "INSTAGRAM", leadType: "CORPORATE", temperature: "COLD", status: "NEW", leadScore: 30, assignedRepId: users[5].id, interestedFacilities: '["Corporate Events"]', budgetRange: "50K_PLUS", remarks: "DM on Instagram about corporate packages.", tags: '["corporate"]' },
      { firstName: "Tariq", lastName: "Mahmood", phone: "03487778899", email: "tariq.m@gmail.com", source: "REFERRAL", leadType: "MEMBERSHIP", temperature: "WARM", status: "CONTACTED", leadScore: 60, assignedRepId: users[6].id, interestedFacilities: '["Cricket","Football","Gym"]', budgetRange: "10K_15K", remarks: "Referred by existing member.", tags: '["referral"]' },
    ];

    for (const lead of leads) {
      await prisma.lead.create({ data: lead });
    }

    await prisma.auditLog.createMany({ data: [
      { actorType: "SYSTEM", actorName: "System", entityType: "USER", action: "CREATE", remarks: "Database seeded via /api/setup" },
    ]});

    await prisma.$disconnect();
    return NextResponse.json({ message: "Database seeded successfully", users: users.length, leads: leads.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
