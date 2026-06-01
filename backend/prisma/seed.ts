import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const SEED_DATA = {
  admin: {
    name: 'Lina',
    email: 'lina@aajil.sa',
    password: 'admin123',
    role: 'admin' as const,
  },
  suppliers: [
    {
      name: 'Khaled',
      email: 'khaled@supplier.sa',
      password: 'supplier123',
      referralCode: 'KHALED01',
    },
    {
      name: 'Mona',
      email: 'mona@supplier.sa',
      password: 'supplier123',
      referralCode: 'MONA0001',
    },
  ],
  client: {
    businessName: 'Yasser Construction',
    contactName: 'Yasser',
    phone: '+966500000001',
    email: 'yasser@client.sa',
    attributedToSupplier: 'khaled@supplier.sa',
  },
};

async function main() {
  let seeded = false;

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: SEED_DATA.admin.email },
  });

  if (existingAdmin) {
    console.log('[seed] Seed data already exists. Skipping.');
    return;
  }

  seeded = true;
  console.log('[seed] Seeding database with persona data...\n');

  // Create Admin user (Lina)
  const adminPasswordHash = await bcrypt.hash(SEED_DATA.admin.password, SALT_ROUNDS);
  const adminUser = await prisma.user.create({
    data: {
      email: SEED_DATA.admin.email,
      passwordHash: adminPasswordHash,
      name: SEED_DATA.admin.name,
      role: SEED_DATA.admin.role,
    },
  });

  // Create Supplier users and profiles
  const supplierRecords: Record<string, { userId: string; supplierId: string }> = {};

  for (const supplier of SEED_DATA.suppliers) {
    const passwordHash = await bcrypt.hash(supplier.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: supplier.email,
        passwordHash,
        name: supplier.name,
        role: 'supplier',
      },
    });

    const supplierRecord = await prisma.supplier.create({
      data: {
        userId: user.id,
        name: supplier.name,
        contactEmail: supplier.email,
        referralCode: supplier.referralCode,
        status: 'active',
      },
    });

    supplierRecords[supplier.email] = {
      userId: user.id,
      supplierId: supplierRecord.id,
    };
  }

  // Create Client (Yasser) attributed to Khaled
  const khaledSupplierId = supplierRecords[SEED_DATA.client.attributedToSupplier].supplierId;

  await prisma.client.create({
    data: {
      supplierId: khaledSupplierId,
      businessName: SEED_DATA.client.businessName,
      contactName: SEED_DATA.client.contactName,
      phone: SEED_DATA.client.phone,
      email: SEED_DATA.client.email,
    },
  });

  // Log credentials to console
  if (seeded) {
    console.log('='.repeat(60));
    console.log('  SEED DATA CREDENTIALS');
    console.log('='.repeat(60));
    console.log('');
    console.log('  Admin:');
    console.log(`    Name:     ${SEED_DATA.admin.name}`);
    console.log(`    Email:    ${SEED_DATA.admin.email}`);
    console.log(`    Password: ${SEED_DATA.admin.password}`);
    console.log('');
    console.log('  Suppliers:');
    for (const supplier of SEED_DATA.suppliers) {
      console.log(`    Name:          ${supplier.name}`);
      console.log(`    Email:         ${supplier.email}`);
      console.log(`    Password:      ${supplier.password}`);
      console.log(`    Referral Code: ${supplier.referralCode}`);
      console.log('');
    }
    console.log('  Client (no login):');
    console.log(`    Name:     ${SEED_DATA.client.contactName}`);
    console.log(`    Email:    ${SEED_DATA.client.email}`);
    console.log(`    Business: ${SEED_DATA.client.businessName}`);
    console.log(`    Referred by: Khaled (${SEED_DATA.client.attributedToSupplier})`);
    console.log('');
    console.log('='.repeat(60));
    console.log('[seed] Database seeded successfully!\n');
  }
}

main()
  .catch((e) => {
    console.error('[seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
