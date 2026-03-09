import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✅ Map دقيق — lowercase + trim
const COORDS: Record<string, [number, number]> = {
  'alger':          [36.7538,  3.0588 ],
  'algiers':        [36.7538,  3.0588 ],
  'oran':           [35.6969, -0.6331 ],
  'blida':          [36.4700,  2.8300 ],
  'tlemcen':        [34.8828, -1.3167 ],
  'constantine':    [36.3650,  6.6147 ],
  'annaba':         [36.9000,  7.7667 ],
  'sétif':          [36.1898,  5.4106 ],
  'setif':          [36.1898,  5.4106 ],
  'batna':          [35.5560,  6.1740 ],
  'biskra':         [34.8500,  5.7333 ],
  'béjaïa':         [36.7500,  5.0833 ],
  'bejaia':         [36.7500,  5.0833 ],
  'tizi ouzou':     [36.7167,  4.0500 ],
  'tiaret':         [35.3706,  1.3219 ],
  'mostaganem':     [35.9333,  0.0833 ],
  'mascara':        [35.3958,  0.1400 ],
  'sidi bel abbes': [35.1894, -0.6289 ],
  'relizane':       [35.7378,  0.5561 ],
  'ouargla':        [31.9500,  5.3333 ],
  'ghardaia':       [32.4900,  3.6700 ],
  'djelfa':         [34.6706,  3.2631 ],
  'el oued':        [33.3564,  6.8631 ],
  'guelma':         [36.4639,  7.4264 ],
  'skikda':         [36.8761,  6.9061 ],
  'jijel':          [36.8219,  5.7658 ],
  'tébessa':        [35.4044,  8.1247 ],
  'tebessa':        [35.4044,  8.1247 ],
  'médéa':          [36.2638,  2.7519 ],
  'medea':          [36.2638,  2.7519 ],
  'msila':          [35.7000,  4.5333 ],
  'saida':          [34.8303,  0.1511 ],
  'bechar':         [31.6167, -2.2167 ],
  'laghouat':       [33.8000,  2.8833 ],
  'tamanrasset':    [22.7850,  5.5228 ],
  'adrar':          [27.8742, -0.2939 ],
};

async function main() {
  // ✅ أولاً — Reset كل الـ coordinates الخاطئة (35.1937)
  const resetResult = await prisma.user.updateMany({
    where: { latitude: 35.1937 },
    data:  { latitude: null, longitude: null },
  });
  console.log(`🔄 Reset ${resetResult.count} users with wrong coordinates (35.1937)\n`);

  // ✅ ثانياً — جلب كل المستخدمين بـ city
  const users = await prisma.user.findMany({
    where:  { city: { not: null } },
    select: { id: true, firstName: true, lastName: true, city: true },
  });

  console.log(`Found ${users.length} users with city\n`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    // trim + lowercase للمطابقة
    const key = user.city!.trim().toLowerCase();
    const coords = COORDS[key];

    if (coords) {
      await prisma.user.update({
        where: { id: user.id },
        data:  { latitude: coords[0], longitude: coords[1] },
      });
      console.log(`✅ ${user.firstName} ${user.lastName} | "${user.city}" → [${coords[0]}, ${coords[1]}]`);
      updated++;
    } else {
      console.log(`⚠️  Unknown city: "${user.city}" — ${user.firstName} ${user.lastName}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done — Updated: ${updated} | Skipped (unknown city): ${skipped}`);

  // ✅ ثالثاً — عرض النتيجة النهائية
  const final = await prisma.user.findMany({
    where: { role: 'DONOR' },
    select: { firstName: true, city: true, latitude: true, longitude: true },
  });
  console.log('\n📊 Final state:');
  final.forEach((u) =>
    console.log(`  ${u.firstName} | ${u.city || 'no city'} | lat:${u.latitude} lng:${u.longitude}`),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());