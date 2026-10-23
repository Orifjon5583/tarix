# “Xotiralarim” — Shaxsiy Xotiralar va Muhim Sanalarni Saqlash Platformasi

**Loyiha nomi:** Xotiralarim  
**Interfeys tili:** O‘zbek tili (Lotin yozuvi)  
**Dizayn mavzusi:** Zamonaviy, premium qora (Dark luxury / Graphite / Violet glow)  
**Texnologik stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Supabase (Auth, PostgreSQL, Storage, RLS), PWA  
**Vaqt zonasi:** Asia/Tashkent  

---

## 📖 Mundarija
1. [Loyiha haqida](#1-loyiha-haqida)
2. [Bajarilgan funksiyalar](#2-bajarilgan-funksiyalar)
3. [Arxitektura va Xavfsizlik](#3-arxitektura-va-xavfsizlik)
4. [O‘rnatish va Ishga tushirish](#4-ornatish-va-ishga-tushirish)
5. [Supabase Ma’lumotlar bazasi va Storage sozlash](#5-supabase-malumotlar-bazasi-va-storage-sozlash)
6. [Administrator akkauntini xavfsiz yaratish](#6-administrator-akkauntini-xavfsiz-yaratish)
7. [Zaxiralash va Tiklash (Backup & Restore)](#7-zaxiralash-va-tiklash-backup--restore)
8. [Avtomatlashtirilgan testlarni ishga tushirish](#8-avtomatlashtirilgan-testlarni-ishga-tushirish)
9. [Deployment (Production muhitiga chiqarish)](#9-deployment-production-muhitiga-chiqarish)
10. [Ma’lum cheklovlar va tashqi servislar talabi](#10-malum-cheklovlar-va-tashqi-servislar-talabi)

---

## 1. Loyiha haqida

**“Xotiralarim”** — foydalanuvchining hayotidagi eng esda qolarli onlari, fotosuratlari, videolari, fikrlari (kundalik), yaqinlarining tavallud kunlari va kelajakdagi o‘ziga qoldiradigan maktublarini (vaqt kapsulasi) yagona, xavfsiz va shaxsiy raqamli arxivda jamlaydi.

Platforma ommaviy ijtimoiy tarmoq emas, balki faqat **bitta egasiga** tegishli maxfiy platformadir. Begona shaxslar o‘zboshimchalik bilan ro‘yxatdan o‘ta olmaydi.

---

## 2. Bajarilgan funksiyalar

| Modul | Funksionallik va Imkoniyatlar |
|---|---|
| **Bosh sahifa (Dashboard)** | Bugungi sana va kun (Asia/Tashkent), shaxsiy salomlashuv, haqiqiy statistika (xotiralar, fotosuratlar, videolar, kundalik, kelajak xatlari), «Bugungi kunda o‘tgan yillarda...» (On this day) bloki, tezkor xotira qo‘shish, oxirgi xotiralar, yaqinlashayotgan muhim sanalar. |
| **Autentifikatsiya & Xavfsizlik** | Yagona sayt egasi tizimi (Single owner). Dastlabki administrator ochilgach, ro‘yxatdan o‘tish bazada avtomatik bloklanadi. Parolni ko‘rsatish/yashirish, tiklash, cookie sessiya boshqaruvi, middleware orqali barcha yo‘llarni himoyalash. |
| **Xotiralar Moduli** | Xotira yaratish, ko‘rish, tahrirlash, o‘chirish, arxivlash, sevimlilarga qo‘shish. Sarlavha, matn, voqea sanasi, vaqti, joy nomi, kayfiyat, kategoriya va teglar. Moslashuvchan qoida: sarlavha, matn yoki rasmlardan biri bo‘lsa saqlash imkoniyati. |
| **Foto va Video Galereyasi** | Rasmlar (JPG, PNG, WebP — 20MB gacha) va videolar (MP4, WebM — 250MB gacha) yuklash. Xavfsiz UUID asosidagi yo‘l (`{userId}/{uuid}.ext`). Lightbox karusel (MediaViewer), to‘liq ekranda ko‘rish, yuklab olish, vaqtinchalik xavfsiz Signed URL. |
| **Matnli Kundalik (Diary)** | Kunlik kechinmalar, his-tuyg‘ular va fikrlar. 1.5 soniyali debouncing bilan **avtomatik saqlash (Auto-save)** («Saqlanmoqda...», «Saqlandi», «Xatolik»). Sana, kayfiyat, sevimlilar, qidiruv. |
| **Kalendar** | Oy, sana matritsasi, rangli toifalar (Xotira, Kundalik, Muhim sana, Eslatma, Kelajak xati). Sanani bosganda kundagi barcha voqealar ro‘yxati. Oldingi/keyingi oyga o‘tish, «Bugun»ga qaytish. |
| **Muhim Sanalar** | Tug‘ilgan kunlar, yubileylar, to‘ylar, muhim bosqichlar. Yillik avtomatik takrorlanish, qolgan kunlar hisoblagichi, 29-fevral kabisa yili testlangan to‘g‘ri hisobi, necha yoshga to‘lishi / yilligi ko‘rsatkichi. |
| **Eslatmalar & Cron** | Eslatma yaratish, takrorlanish (har kuni, hafta, oy, yil), faollik holati. Server cron endpoint (`/api/cron/reminders`) orqali sayt yopiq bo‘lsa ham bildirishnomalarni boshqarish. Duplikatsiyadan himoyalovchi kalit (`deduplication_key`). |
| **Kelajak Xatlari (Vaqt Kapsulasi)** | Kelajakdagi o‘zingizga xat yozish, ochilish sanasi va vaqtini belgilash. **Qat’iy Server-Side Redaction:** muddatidan oldin API xat matnini `null` qilib qaytaradi. Vaqti kelganda server tekshiruvi va bayramona confetti effekti bilan ochish. |
| **Global Qidiruv** | Ctrl+K tezkor klavishi yoki qidiruv tugmasi orqali xotiralar, kundalik, muhim sanalar bo‘yicha tezkor qidiruv. |
| **Arxiv & Sevimlilar** | Arxivlangan xotiralarni alohida saqlash, bir bosishda qayta tiklash (restore) yoki butunlay tozalash. Sevimlilar markazida barcha turdagi sevimli yozuvlarni ko‘rish. |
| **Eksport & Zaxira** | **JSON Eksport:** Barcha ma’lumotlar bazasining to‘liq nusxasi. **CSV Eksport:** Excel uchun mos jadvallar. **ZIP Arxiv:** JSON, CSV va README jamlangan arxiv paketi. |
| **PWA** | Mobil telefon bosh ekraniga o‘rnatish imkoniyati (Web App Manifest, standalone rejim, xavfsiz kesh siyosati). |

---

## 3. Arxitektura va Xavfsizlik

```
┌─────────────────────────────────────────────────────────────┐
│                       NEXT.JS FRONTEND                      │
│      App Router, Tailwind CSS (Dark Luxury), React 18       │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
        Middleware Auth                 API Route Handlers
        & Client SDK                    & Server Actions
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE / POSTGRESQL                    │
│   • Row Level Security (RLS) har bir jadvalda yoqilgan      │
│   • auth.uid() = user_id qat'iy tekshiruvi                  │
│   • trigger: handle_new_user() (dastlabki egadan so'ng lock)│
│   • secure function: get_safe_future_letters()              │
│   • private Storage: memories-media (faqat Signed URL)      │
└─────────────────────────────────────────────────────────────┘
```

1. **Parollar va Maxfiy Kalitlar:**
   - Supabase Auth bcrypt/argon2 asosida parollarni shifrlaydi.
   - `SUPABASE_SERVICE_ROLE_KEY` hech qachon brauzerga uzatilmaydi (`NEXT_PUBLIC_` prefiksisiz faqat serverda ishlatiladi).
2. **Private Storage:**
   - Media fayllar ombori ommaga yopiq (`public: false`).
   - Fayllarni ochish uchun server qisqa muddatli (masalan, 3600 soniya) Signed URL yaratadi.
   - Fayl yo‘llari taxmin qilib bo‘lmas UUID bilan saqlanadi (`{userId}/{uuid}.{ext}`).
3. **Kelajak Xatlari Himoyasi:**
   - Xat ochilish sanasidan oldin faqat frontendda yashirilmaydi, balki server API (`/api/letters/safe`) tomonidan xat matni `null` qilinadi.

---

## 4. O‘rnatish va Ishga tushirish

### Talablar:
- Node.js 18+ (tavsiya etiladi: Node.js 20 yoki 24)
- npm yoki mos paket menejeri
- Supabase hisobi (bepul yoki pullik)

### Bosqichma-bosqich:

1. **Loyihani yuklab oling va papkaga kiring:**
   ```bash
   cd "c:\Users\legio\OneDrive\Ishchi stol\tarix"
   ```

2. **Kutubxonalarni o‘rnating:**
   ```bash
   npm install
   ```

3. **Muhit o‘zgaruvchilarini sozlang:**
   `.env.example` faylidan nusxa olib `.env.local` yarating:
   ```bash
   cp .env.example .env.local
   ```
   Va o‘z Supabase loyihangiz ma’lumotlarini kiriting:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://sizning-loyihangiz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sizning_anonim_kalitingiz
   SUPABASE_SERVICE_ROLE_KEY=sizning_service_role_kalitingiz
   CRON_SECRET=ixtiyoriy_murakkab_xavfsizlik_tokeni
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Loyiha kodini tekshirish va yig‘ish (Build):**
   ```bash
   npm run build
   ```

5. **Dasturchi rejimida ishga tushirish:**
   ```bash
   npm run dev
   ```
   Brauzerda oching: [http://localhost:3000](http://localhost:3000)

---

## 5. Supabase Ma’lumotlar bazasi va Storage sozlash

1. Supabase boshqaruv paneliga kiring ([supabase.com](https://supabase.com)).
2. **SQL Editor** bo‘limini oching.
3. Loyihadagi `supabase/migrations/20241023000000_init_schema.sql` fayli ichidagi barcha SQL kodini nusxalab, SQL Editor’ga joylang va **Run** tugmasini bosing.
4. Ushbu SQL kodi quyidagilarni avtomatik yaratadi:
   - 13 ta jadval: `profiles`, `categories`, `tags`, `memories`, `memory_tags`, `diary_entries`, `important_dates`, `reminders`, `future_letters`, `media_assets`, `notifications`, `notification_preferences`, `push_subscriptions`, `system_settings`.
   - Barcha jadvallarda Row Level Security (RLS) yoqiladi va foydalanuvchi huquqlari cheklanadi.
   - Avtomatik `updated_at` va `handle_new_user()` triggerlari o‘rnatiladi.
5. **Storage bo‘limiga o‘ting:**
   - **Create Bucket** tugmasini bosing.
   - Bucket nomiga: `memories-media` deb yozing.
   - **Public bucket** opsiyasini **O‘CHIQLIGICHA** qoldiring (ya’ni private bo‘lishi shart!).
   - Storage Policies bo‘limida faqat avtorizatsiyadan o‘tgan o‘z egasi fayl yuklashi va o‘qishi siyosati o‘rnatilganiga ishonch hosil qiling.

---

## 6. Administrator akkauntini xavfsiz yaratish

Tizim ommaviy foydalanuvchilarga yopiq. Dastlabki administratorni yaratish tartibi:

1. Brauzer orqali `/setup` sahifasiga kiring:
   `http://localhost:3000/setup`
2. Ismingiz, emailingiz va kamida 8 ta belgidan iborat kuchli parolni kiriting.
3. «Administrator hisobini yaratish» tugmasini bosing.
4. **Natijada:**
   - Hisobingiz yaratiladi;
   - Standart kategoriyalar (Bolalik, Oila, Do‘stlar, Sayohat, Ta’lim, Ish, Bayramlar, Shaxsiy yutuqlar, Boshqa) avtomatik hosil qilinadi;
   - `system_settings.registration_locked` qiymati `true` ga o‘zgaradi;
   - Shundan so‘ng boshqa hech kim ro‘yxatdan o‘ta olmaydi, `/setup` sahifasi bloklanadi va faqat `/login` orqali kirish mumkin bo‘ladi.

---

## 7. Zaxiralash va Tiklash (Backup & Restore)

### Zaxira nusxa (Export) olish:
1. Saytga kiring va chap menyudan **Sozlamalar** sahifasini oching.
2. **Eksport va Zaxiralash** bo‘limiga o‘ting.
3. Quyidagi 3 xil variantdan birini tanlang:
   - **JSON yuklab olish:** Tizimdagi barcha ma’lumotlar (xotiralar, kundalik, sanalar, maktublar, eslatmalar) to‘liq tuzilmali JSON holida saqlanadi.
   - **CSV yuklab olish:** Xotiralar va sanalar jadval ko‘rinishida yuklanadi.
   - **ZIP Arxivini yuklash:** JSON va barcha CSV jadvallari hamda tushuntirish faylini o‘z ichiga olgan bitta siqilgan arxiv fayli taqdim etiladi.

### Tiklash (Restore) strategiyasi:
- Agar ma’lumotlarni qayta tiklash kerak bo‘lsa, saqlangan `xotiralarim_zaxira_*.json` faylidan foydalaniladi.
- Supabase panelida yoki server skripti orqali JSON fayldagi yozuvlar tegishli jadvallarga import qilinadi.

---

## 8. Avtomatlashtirilgan testlarni ishga tushirish

Loyiha uchun barcha maxsus holatlar (29-fevral kabisa yili takrorlanishi, media fayllar validatsiyasi, kelajak xatlari matnining serverda qat’iy yashirilishi, xavfsiz storage identifikatorlari va CSV xavfsizligi) bo‘yicha testlar ishlab chiqilgan:

Testlarni yurgizish:
```bash
npm test
```
Natija:
```
======================================================
🚀 XOTIRALARIM — TESTLARNI ISHGA TUSHIRISH
======================================================
  ✅ [PASS] 29-fevral 2020 (kabisa) bo‘lgan sana 2023 yilda 28-fevralga to‘g‘ri siljiydi
  ✅ [PASS] 29-fevral sanasi 2024 (kabisa yili) da aynan 29-fevral kuni nishonlanadi
  ✅ [PASS] JPG rasm 5 MB hajm bilan to‘g‘ri qabul qilinadi
  ✅ [PASS] 25 MB rasm rad etiladi (hajm 20 MB dan oshgan)
  ✅ [PASS] MP4 video 150 MB hajm bilan to‘g‘ri qabul qilinadi
  ✅ [PASS] Xavfli format (.exe, .bat, scriptlar) rad etiladi
  ✅ [PASS] Ochilish vaqti kelmagan xat matni (body) NULL qilinadi
  ✅ [PASS] Ochilish vaqti yetib kelgan xat matni to‘liq ochiladi
  ✅ [PASS] Fayl nomidagi xavfli belgilar tozalanadi va foydalanuvchi jildiga ajratiladi
  ✅ [PASS] CSV eksportida matn ichidagi qo‘shtirnoq va vergullar to‘g‘ri himoyalanadi
======================================================
📊 TEST NATIJALARI: 10/10 muvaffaqiyatli o‘tdi (100%)
======================================================
```

---

## 9. Deployment (Production muhitiga chiqarish)

### Vercel orqali joylashtirish:
1. Loyihani shaxsiy GitHub reposiga yuklang (`git push`).
2. [vercel.com](https://vercel.com) saytiga kiring va reponi import qiling.
3. **Environment Variables** bo‘limida `.env.example` dagi o‘zgaruvchilarni qo‘shing (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).
4. **Deploy** tugmasini bosing.
5. Vercel avtomatik HTTPS sertifikatini ulaydi va loyihani ishga tushiradi.

### Eslatmalar uchun Vercel Cron sozlash:
`vercel.json` fayli orqali har soatda `/api/cron/reminders` yo‘liga so‘rov yuborish rejalashtirilishi mumkin.

---

## 10. Ma’lum cheklovlar va tashqi servislar talabi

1. **Email orqali xabar yuborish:** Email eslatmalarni jo‘natish uchun tashqi SMTP provayderi (Resend, SendGrid yoki Supabase SMTP) kalitlari talab qilinadi. Sayt ichidagi bildirishnomalar va kalendar ogohlantirishlari esa hech qanday tashqi servis talab qilmay, to‘liq ishlaydi.
2. **Web Push bildirishnomalari:** Brauzer orqali foydalanuvchiga fon rejimida push yuborish uchun `.env.local` da VAPID kalitlari (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) ko‘rsatilishi va foydalanuvchi brauzerida ruxsat berilishi kerak.
3. **HEIC rasmlari:** Apple iOS qurilmalaridagi HEIC formati barcha brauzerlarda to‘g‘ridan-to‘g‘ri ochilmasligi mumkin, shu bois standart JPG/PNG/WebP formatlaridan foydalanish tavsiya etiladi.
