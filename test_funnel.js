const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api/screening';
const email = `test.funnel.${Date.now()}@example.com`;

async function testFunnel() {
  console.log('======= STARTING FUNNEL AUDIT =======');
  console.log(`Testing with email: ${email}\n`);

  try {
    // 1. Apply
    console.log('-> STEP 1: Apply (/apply)');
    const applyRes = await fetch(`${BASE_URL}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Funnel Tester',
        email,
        phone: '9876543210',
        college: 'Test College',
        year: '4th',
        branch: 'CSE',
      }),
    });
    const applyData = await applyRes.json();
    console.log('API Response:', applyRes.status, applyData);
    if (!applyData.success) throw new Error('Apply failed');

    // Verify DB
    let dbRecord = await prisma.$queryRawUnsafe(`SELECT * FROM screening_leads WHERE email = $1`, email);
    console.log('DB State:', dbRecord[0], '\n');

    // 1.5 Duplicate test
    console.log('-> STEP 1.5: Duplicate Apply (/apply)');
    const dupRes = await fetch(`${BASE_URL}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Funnel Tester 2',
        email,
        phone: '9876543210',
        college: 'Test College',
        year: '4th',
        branch: 'CSE',
      }),
    });
    const dupData = await dupRes.json();
    console.log('API Response:', dupRes.status, dupData, '\n');

    // 2. Submit Test
    console.log('-> STEP 2: Submit Test (/submit-test)');
    const testRes = await fetch(`${BASE_URL}/submit-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        answers: { mcq: { q1: 'printf("Hello");', q2: 'stdio.h' } }, // Score 2
      }),
    });
    const testData = await testRes.json();
    console.log('API Response:', testRes.status, testData);
    
    // Verify DB
    dbRecord = await prisma.$queryRawUnsafe(`SELECT * FROM screening_leads WHERE email = $1`, email);
    console.log('DB State:', dbRecord[0], '\n');

    // 3. Confirm Click
    console.log('-> STEP 3: Confirm Click (/confirm-click)');
    const confirmRes = await fetch(`${BASE_URL}/confirm-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const confirmData = await confirmRes.json();
    console.log('API Response:', confirmRes.status, confirmData);
    
    // Verify DB
    dbRecord = await prisma.$queryRawUnsafe(`SELECT * FROM screening_leads WHERE email = $1`, email);
    console.log('DB State:', dbRecord[0], '\n');

    // 4. Convert
    console.log('-> STEP 4: Convert (/convert)');
    const convertRes = await fetch(`${BASE_URL}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const convertData = await convertRes.json();
    console.log('API Response:', convertRes.status, convertData);
    
    // Verify DB
    dbRecord = await prisma.$queryRawUnsafe(`SELECT * FROM screening_leads WHERE email = $1`, email);
    console.log('DB State:', dbRecord[0], '\n');

    console.log('======= ✅ FUNNEL AUDIT SUCCESS =======');
  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFunnel();
