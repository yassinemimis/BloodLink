import { PrismaClient, BloodGroup, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@bloodlink.dz' },
    update: {},
    create: {
      email: 'admin@bloodlink.dz',
      password: await hash('Admin@123456'),
      firstName: 'Super', lastName: 'Admin',
      phone: '+213550000001',
      bloodGroup: BloodGroup.O_POSITIVE,
      role: Role.ADMIN, isVerified: true, isAvailable: false,
      city: 'Alger', latitude: 36.752887, longitude: 3.042048,
    },
  });

  // Doctor
  await prisma.user.upsert({
    where: { email: 'dr.benali@bloodlink.dz' },
    update: {},
    create: {
      email: 'dr.benali@bloodlink.dz',
      password: await hash('Doctor@123456'),
      firstName: 'Karim', lastName: 'Benali',
      phone: '+213550000002',
      bloodGroup: BloodGroup.A_POSITIVE,
      role: Role.DOCTOR, isVerified: true,
      city: 'Alger', latitude: 36.753, longitude: 3.043,
    },
  });

  // Donors
  const donors = [
    { email: 'ahmed@example.com', firstName: 'Ahmed', lastName: 'Mansouri', bloodGroup: BloodGroup.O_POSITIVE, city: 'Alger', lat: 36.76, lng: 3.05 },
    { email: 'sara@example.com', firstName: 'Sara', lastName: 'Boumediene', bloodGroup: BloodGroup.A_NEGATIVE, city: 'Alger', lat: 36.74, lng: 3.06 },
    { email: 'khaled@example.com', firstName: 'Khaled', lastName: 'Rahmani', bloodGroup: BloodGroup.O_NEGATIVE, city: 'Blida', lat: 36.47, lng: 2.83 },
    { email: 'fatima@example.com', firstName: 'Fatima', lastName: 'Zerhouni', bloodGroup: BloodGroup.B_POSITIVE, city: 'Oran', lat: 35.69, lng: -0.63 },
  ];

  for (const d of donors) {
    await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email, password: await hash('Donor@123456'),
        firstName: d.firstName, lastName: d.lastName,
        bloodGroup: d.bloodGroup, role: Role.DONOR,
        isVerified: true, city: d.city,
        latitude: d.lat, longitude: d.lng,
        phone: '+2135500' + Math.floor(Math.random() * 99999).toString().padStart(5, '0'),
      },
    });
  }

  // Patient
  await prisma.user.upsert({
    where: { email: 'patient@example.com' },
    update: {},
    create: {
      email: 'patient@example.com',
      password: await hash('Patient@123456'),
      firstName: 'Omar', lastName: 'Belkacem',
      phone: '+213550000020',
      bloodGroup: BloodGroup.A_POSITIVE,
      role: Role.PATIENT, isVerified: true,
      city: 'Alger', latitude: 36.752, longitude: 3.042,
    },
  });

  // Centers + Blood Stocks
  const centers = [
    { name: 'CNTS Alger', address: 'Bd Mohamed V', city: 'Alger', latitude: 36.7538, longitude: 3.0588, openingHours: 'Dim-Jeu: 08h-16h' },
    { name: 'CTS CHU Mustapha', address: 'Place 1er Mai', city: 'Alger', latitude: 36.758, longitude: 3.051, openingHours: 'Dim-Jeu: 08h-15h' },
    { name: 'CTS Blida', address: 'CHU Frantz Fanon', city: 'Blida', latitude: 36.47, longitude: 2.828, openingHours: 'Dim-Jeu: 08h30-15h30' },
  ];

  for (const c of centers) {
    const center = await prisma.center.create({ data: c });
    const allGroups = Object.values(BloodGroup);
    await prisma.bloodStock.createMany({
      data: allGroups.map((bg) => ({
        centerId: center.id,
        bloodGroup: bg,
        unitsAvailable: Math.floor(Math.random() * 30) + 5,
      })),
    });
  }

  console.log('✅ Admin:    admin@bloodlink.dz / Admin@123456');
  console.log('✅ Doctor:   dr.benali@bloodlink.dz / Doctor@123456');
  console.log('✅ Donors:   ahmed@example.com / Donor@123456');
  console.log('✅ Patient:  patient@example.com / Patient@123456');
  console.log('✅ 3 Centers with blood stocks');
  console.log('🎉 Seeding done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());