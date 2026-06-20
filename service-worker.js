// ============================================================
// Service Worker — النسخة النهائية v10
// ============================================================
// الإصلاحات عن v9:
// 1. تصحيح المسار الأساسي (BASE) من '/My-Korean-app/' إلى '/Website/'
//    ليطابق اسم المستودع الفعلي على GitHub Pages:
//    https://malazmubarakali-tech.github.io/Website/
//    — هذا تصحيح حرج: أي اختلاف بين الـ scope هنا ومسار الاستضافة
//    الفعلي يجعل تسجيل الـ Service Worker بالكامل يفشل بصمت.
// 2. نفس الإصلاح طُبّق على كل وسوم apple-touch-icon وروابط تسجيل
//    الـ Service Worker داخل: chat.html, listening-system.html,
//    privacy-policy.html, reading-menu.html, reading-system.html,
//    writing-system.html.
// 3. ترقية رقم الكاش إلى v10 لإجبار أي جهاز ثبّت نسخة بمسار خاطئ
//    سابقاً على إعادة التسجيل بالمسار الصحيح من الصفر.
//
// ملخص الإصلاحات السابقة من v8 → v9 (لا تزال سارية):
// - إزالة ملفات وهمية من الكاش (achievements.html, stories.html,
//   learn-center.html, أيقونتي maskable) لأنها غير موجودة فعلياً.
// - إضافة web-adapter.js إلى قائمة التخزين (كان مفقوداً تماماً).
// - إنشاء offline.html فعلياً كصفحة احتياطية حقيقية.
// ============================================================

const CACHE_NAME = 'korean-app-v10';
const BASE = '/Website/';

// ===== الملفات المحلية (كل ملف هنا تم التحقق من وجوده فعلياً) =====
const LOCAL_ASSETS = [
  BASE + 'index.html',
  BASE + 'style.css',
  BASE + 'script.js',
  BASE + 'app-patches.js',
  BASE + 'web-adapter.js',
  BASE + 'data.js',
  BASE + 'data2.js',
  BASE + 'data3.js',
  BASE + 'data4.js',
  BASE + 'manifest.json',
  BASE + 'offline.html',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'chat.html',
  BASE + 'privacy-policy.html',
  BASE + 'reading-menu.html',
  BASE + 'reading-system.html',
  BASE + 'reading-data.js',
  BASE + 'listening-system.html',
  BASE + 'listening-data.js',
  BASE + 'listening-engine.js',
  BASE + 'writing-system.html',
  BASE + 'writing-data.js',
  BASE + 'writing-engine.js'
];

// ===== الموارد الخارجية — جميع URLs الفعلية المستخدمة في الصفحات =====
const EXTERNAL_ASSETS = [
  // Font Awesome 6.4.0 — نفس الإصدار المستخدم في جميع الصفحات
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',

  // Google Fonts — URL #1: Tajawal+Fredoka (index, achievements, learn-center, stories)
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Fredoka:wght@400;600;700&display=swap',

  // Google Fonts — URL #2: Tajawal+Noto+Sans+KR (listening, reading, writing)
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap',

  // Google Fonts — URL #3: Tajawal فقط (chat, privacy-policy, reading-menu)
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap'
];

// ========== التثبيت ==========
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // 1. تخزين الملفات المحلية
      await Promise.allSettled(
        LOCAL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('⚠️ فشل تخزين محلي:', url, err))
        )
      );
      // 2. تخزين الموارد الخارجية
      await Promise.allSettled(
        EXTERNAL_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(res => {
              if (res.ok || res.type === 'opaque') cache.put(url, res);
            })
            .catch(err => console.warn('⚠️ فشل تخزين خارجي:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// ========== التفعيل ==========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('🗑️ حذف كاش قديم:', key);
          return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// ========== الجلب ==========
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) صفحات HTML — Network First ثم كاش ثم index.html ثم offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() =>
          // أولاً: ابحث في الكاش بالـ URL الدقيق (يشمل query strings)
          caches.match(request, { ignoreSearch: false })
            .then(cached => {
              if (cached) return cached;
              // ثانياً: ابحث بتجاهل query string (يحل مشكلة ?source=pwa)
              return caches.match(request, { ignoreSearch: true });
            })
            .then(cached => {
              if (cached) return cached;
              // ثالثاً: ارجع إلى index.html (الصفحة الرئيسية للتطبيق)
              return caches.match(BASE + 'index.html');
            })
            .then(cached => cached || caches.match(BASE + 'offline.html'))
        )
    );
    return;
  }

  // 2) ملفات صوتية — Cache First ثم شبكة
  if (url.pathname.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => new Response(null, { status: 408, statusText: 'Offline' }));
      })
    );
    return;
  }

  // 3) خطوط Google + Font Awesome — Cache First (ضروري للعمل offline)
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request, { mode: 'cors' }).then(response => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // 4) باقي الملفات — Stale While Revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
