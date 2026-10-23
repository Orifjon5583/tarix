// ====================================================================
// XOTIRALARIM PLATFORMASI — AVTOMATLASHGAN TEST TO‘PLAMI
// ====================================================================

const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Xato: ${err.message}`);
  }
}

console.log('======================================================');
console.log('🚀 XOTIRALARIM — TESTLARNI ISHGA TUSHIRISH');
console.log('======================================================\n');

// -------------------------------------------------------------------
// 1. KALENDAR VA 29-FEVRAL KABISA YILI TESTI
// -------------------------------------------------------------------
console.log('📌 1. Kalendar va 29-Fevral takrorlanish tekshiruvlari:');

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function calculateNextOccurrenceTest(eventDateStr, repeatYearly, referenceDate) {
  const parts = eventDateStr.split('-');
  const origYear = parseInt(parts[0], 10);
  const origMonth = parseInt(parts[1], 10) - 1; // 0-based
  const origDay = parseInt(parts[2], 10);

  const currentYear = referenceDate.getFullYear();
  let targetYear = currentYear;

  // Handle Feb 29 in non-leap years
  let targetDay = origDay;
  if (origMonth === 1 && origDay === 29 && !isLeapYear(targetYear)) {
    targetDay = 28; // Fallback to Feb 28
  }

  let targetDate = new Date(targetYear, origMonth, targetDay);
  if (targetDate.getTime() < referenceDate.getTime()) {
    targetYear += 1;
    targetDay = origDay;
    if (origMonth === 1 && origDay === 29 && !isLeapYear(targetYear)) {
      targetDay = 28;
    }
    targetDate = new Date(targetYear, origMonth, targetDay);
  }

  const diffMs = targetDate.getTime() - referenceDate.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return {
    nextDate: targetDate,
    targetYear,
    targetDay,
    daysUntil: Math.max(0, daysUntil),
    yearsPassed: targetYear - origYear,
  };
}

runTest('29-fevral 2020 (kabisa) bo‘lgan sana 2023 (kabisa bo‘lmagan) yilda 28-fevralga to‘g‘ri siljiydi', () => {
  const ref = new Date(2023, 0, 1); // 1 Jan 2023
  const res = calculateNextOccurrenceTest('2020-02-29', true, ref);
  assert.strictEqual(res.targetYear, 2023);
  assert.strictEqual(res.targetDay, 28);
  assert.strictEqual(res.yearsPassed, 3);
});

runTest('29-fevral sanasi 2024 (kabisa yili) da aynan 29-fevral kuni nishonlanadi', () => {
  const ref = new Date(2024, 0, 1); // 1 Jan 2024
  const res = calculateNextOccurrenceTest('2020-02-29', true, ref);
  assert.strictEqual(res.targetYear, 2024);
  assert.strictEqual(res.targetDay, 29);
  assert.strictEqual(res.yearsPassed, 4);
});

// -------------------------------------------------------------------
// 2. FOTO VA VIDEO HAJMI VA FORMAT VALIDATSIYASI
// -------------------------------------------------------------------
console.log('\n📌 2. Media hajmi va MIME turlari validatsiyasi:');

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 250 * 1024 * 1024; // 250 MB
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEOS = ['video/mp4', 'video/webm'];

function validateMedia(mimeType, fileSize) {
  const isImage = ALLOWED_IMAGES.includes(mimeType);
  const isVideo = ALLOWED_VIDEOS.includes(mimeType);

  if (!isImage && !isVideo) {
    return { valid: false, error: 'Ruxsat etilmagan format' };
  }
  if (isImage && fileSize > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Rasm hajmi 20 MB dan katta' };
  }
  if (isVideo && fileSize > MAX_VIDEO_SIZE) {
    return { valid: false, error: 'Video hajmi 250 MB dan katta' };
  }
  return { valid: true, mediaType: isImage ? 'image' : 'video' };
}

runTest('JPG rasm 5 MB hajm bilan to‘g‘ri qabul qilinadi', () => {
  const res = validateMedia('image/jpeg', 5 * 1024 * 1024);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mediaType, 'image');
});

runTest('25 MB rasm rad etiladi (hajm 20 MB dan oshgan)', () => {
  const res = validateMedia('image/png', 25 * 1024 * 1024);
  assert.strictEqual(res.valid, false);
});

runTest('MP4 video 150 MB hajm bilan to‘g‘ri qabul qilinadi', () => {
  const res = validateMedia('video/mp4', 150 * 1024 * 1024);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.mediaType, 'video');
});

runTest('Xavfli format (.exe, .bat, scriptlar) rad etiladi', () => {
  const res = validateMedia('application/x-msdownload', 1024);
  assert.strictEqual(res.valid, false);
});

// -------------------------------------------------------------------
// 3. KELAJAK XATLARI XAVFSIZLIK VA REDACTION TESTI
// -------------------------------------------------------------------
console.log('\n📌 3. Kelajak xatlari server-side himoyasi:');

function safeRedactLetter(letter, currentServerTime) {
  const isUnlocked = new Date(letter.unlock_at).getTime() <= currentServerTime.getTime();
  return {
    id: letter.id,
    title: letter.title,
    body: isUnlocked ? letter.body : null, // REDACTED!
    unlock_at: letter.unlock_at,
    is_unlocked: isUnlocked,
    status: isUnlocked ? 'ready' : 'locked',
  };
}

runTest('Ochilish vaqti kelmagan xat matni (body) NULL qilinadi', () => {
  const now = new Date('2024-10-23T12:00:00Z');
  const futureLetter = {
    id: 'letter-123',
    title: 'Mening kelajagim',
    body: 'Bu juda maxfiy kelajak maktubi!',
    unlock_at: '2028-10-23T12:00:00Z',
  };

  const safe = safeRedactLetter(futureLetter, now);
  assert.strictEqual(safe.body, null, 'Server kelajak xati matnini null qilishi shart');
  assert.strictEqual(safe.is_unlocked, false);
  assert.strictEqual(safe.status, 'locked');
});

runTest('Ochilish vaqti yetib kelgan xat matni to‘liq ochiladi', () => {
  const now = new Date('2028-10-24T12:00:00Z');
  const pastLetter = {
    id: 'letter-123',
    title: 'Mening kelajagim',
    body: 'Bu juda maxfiy kelajak maktubi!',
    unlock_at: '2028-10-23T12:00:00Z',
  };

  const safe = safeRedactLetter(pastLetter, now);
  assert.strictEqual(safe.body, 'Bu juda maxfiy kelajak maktubi!');
  assert.strictEqual(safe.is_unlocked, true);
  assert.strictEqual(safe.status, 'ready');
});

// -------------------------------------------------------------------
// 4. STORAGE YO‘LI TAXMIN QILIB BO‘LMAYDIGAN IDENTIFIKATOR BILAN YARATILISHI
// -------------------------------------------------------------------
console.log('\n📌 4. Storage xavfsiz yo‘l yaratilishi:');

function generateStoragePath(userId, originalFileName) {
  const ext = originalFileName.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  const uniqueId = 'uuid-' + Math.random().toString(36).substring(2, 10);
  return `${userId}/${uniqueId}.${ext}`;
}

runTest('Fayl nomidagi xavfli belgilar tozalanadi va foydalanuvchi jildiga ajratiladi', () => {
  const path = generateStoragePath('user-1', '../../../shaxsiy..rasm.PNG');
  assert(path.startsWith('user-1/'));
  assert(path.endsWith('.png'));
  assert(!path.includes('..'));
});

// -------------------------------------------------------------------
// 5. EKSPORT CSV QO‘SHTIRNOQ VA MAXSUS BELGILAR HIMOYASI
// -------------------------------------------------------------------
console.log('\n📌 5. Ma’lumotlar eksporti va CSV sanitizatsiyasi:');

function sanitizeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

runTest('CSV eksportida matn ichidagi qo‘shtirnoq va vergullar to‘g‘ri himoyalanadi', () => {
  const title = 'Xotira: "Toshkent", chiroyli shahar';
  const escaped = sanitizeCsvField(title);
  assert.strictEqual(escaped, '"Xotira: ""Toshkent"", chiroyli shahar"');
});

// -------------------------------------------------------------------
// YAKUNIY NATIJALAR
// -------------------------------------------------------------------
console.log('\n======================================================');
console.log(`📊 TEST NATIJALARI: ${passedTests}/${totalTests} muvaffaqiyatli o‘tdi (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
