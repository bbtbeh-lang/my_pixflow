# راه‌اندازی Supabase + Cloudflare R2 (جایگزین دیتابیس محلی)

این راهنما رو یک‌بار دنبال کن تا مشکل «هر بار Render می‌خوابه، دیتام پاک می‌شه» برای همیشه حل بشه.

---

## بخش ۱ — Supabase (جایگزین db.json)

### ۱.۱ ساخت پروژه
1. برو به [supabase.com](https://supabase.com) → ثبت‌نام رایگان.
2. **New Project** بزن. یک اسم بذار (مثلاً `pixflow-prod`)، یک پسورد قوی برای دیتابیس بساز (جایی ذخیره‌ش کن)، نزدیک‌ترین Region رو انتخاب کن.
3. چند دقیقه صبر کن تا پروژه Provision بشه.

### ۱.۲ ساخت جدول
برو به تب **SQL Editor** توی داشبورد Supabase، این کوئری رو اجرا کن:

```sql
create table pixflow_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table pixflow_state enable row level security;
-- هیچ policy ای برای anon/public اضافه نمی‌کنیم — یعنی فقط
-- service_role key (که فقط سمت سرور استفاده می‌شه) بهش دسترسی داره.
```

### ۱.۳ گرفتن کلیدها
برو به **Project Settings → API**:
- `Project URL` → این می‌شه `SUPABASE_URL`
- `service_role` key (نه `anon` key!) → این می‌شه `SUPABASE_SERVICE_KEY`

⚠️ **خیلی مهم**: `service_role` key دسترسی کامل به دیتابیست داره و هرگز نباید توی فرانت‌اند یا مرورگر استفاده بشه — فقط سمت سرور (Render) بذارش.

---

## بخش ۲ — Cloudflare R2 (جایگزین آپلود عکس محلی)

### ۲.۱ ساخت باکت
1. برو به [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage** → ثبت‌نام (کارت بانکی می‌خواد ولی توی حد مصرف یک سایت کوچیک، صد در صد رایگانه — ۱۰ گیگ فضای رایگان دائمی).
2. **Create Bucket** بزن، اسمش رو بذار `pixflow-uploads`.

### ۲.۲ فعال کردن دسترسی عمومی (Public Access)
1. داخل باکت → **Settings → Public Access** → **Allow Access** رو فعال کن.
2. آدرس عمومی که می‌ده (چیزی شبیه `https://pub-xxxxxxxxxxxx.r2.dev`) رو کپی کن — این می‌شه `R2_PUBLIC_URL` (بدون `/` آخرش).

### ۲.۳ ساخت API Token
1. برو به **R2 → Manage R2 API Tokens → Create API Token**.
2. Permission: **Object Read & Write**، و دسترسی رو فقط محدود به باکت `pixflow-uploads` کن.
3. بعد از ساخت، سه مقدار می‌گیری:
   - `Access Key ID` → می‌شه `R2_ACCESS_KEY_ID`
   - `Secret Access Key` → می‌شه `R2_SECRET_ACCESS_KEY`
   - آدرس Account ID (بالای صفحه‌ی R2، یا از خود URL endpoint) → می‌شه `R2_ACCOUNT_ID`
4. اسم باکتی که ساختی (`pixflow-uploads`) → می‌شه `R2_BUCKET`

---

## بخش ۳ — تنظیم Environment Variables روی Render

برو به داشبورد Render → سرویس `my_pixflow` → **Environment** → این ۷ متغیر رو اضافه کن:

| Key | Value |
|---|---|
| `SUPABASE_URL` | از بخش ۱.۳ |
| `SUPABASE_SERVICE_KEY` | از بخش ۱.۳ (service_role) |
| `R2_ACCOUNT_ID` | از بخش ۲.۳ |
| `R2_ACCESS_KEY_ID` | از بخش ۲.۳ |
| `R2_SECRET_ACCESS_KEY` | از بخش ۲.۳ |
| `R2_BUCKET` | `pixflow-uploads` |
| `R2_PUBLIC_URL` | از بخش ۲.۲ (بدون `/` انتهایی) |

بعد از ذخیره، Render خودکار سرویس رو Redeploy می‌کنه.

---

## بخش ۴ — اگه دیتای واقعی روی سایت فعلیت داری (مهم!)

قبل از اینکه این تغییرات رو push کنی، اگه توی پنل ادمین فعلیت (نمونه‌کار، تستیمونیال، پیام‌های واقعی) دیتا داری که نمی‌خوای از دست بره:

1. با کاربر ادمین وارد `/admin` بشو و از بخش‌های Portfolio/Testimonials/Messages یه اسکرین‌شات یا کپی از محتوا بگیر (چون فعلاً ابزار Export نداریم).
2. بعد از این‌که سرویس با دیتابیس جدید (خالی) بالا اومد، دوباره از پنل ادمین همون آیتم‌ها رو وارد کن.

*(اگه بخوای، می‌تونیم بعداً یک ابزار Export/Import کوچیک هم به پنل ادمین اضافه کنیم تا این مرحله دیگه لازم نباشه.)*

---

## بخش ۵ — تست نهایی بعد از Deploy
- [ ] وارد `/admin` شو، لاگین کن — باید کار کنه (یعنی Supabase وصله).
- [ ] یک نمونه‌کار تستی اضافه کن، بعد از Render Dashboard دستی سرویس رو **Restart** کن (شبیه‌سازی spin-down)، دوباره چک کن نمونه‌کار هنوز هست.
- [ ] یک عکس آپلود کن، مطمئن شو URL که برمی‌گرده با `R2_PUBLIC_URL` شروع می‌شه و عکس درست لود می‌شه.
- [ ] فرم `/order` یا `/contact` رو تست کن، مطمئن شو پیام توی پنل ادمین ظاهر می‌شه.
