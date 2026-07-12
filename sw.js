// স্বপ্নঘুড়ি — Service Worker
// এই ফাইলটি শুধু "অ্যাপ শেল" (index.html, আইকন, ম্যানিফেস্ট) ক্যাশ করে
// যাতে অ্যাপটি ইন্টারনেট ছাড়াও খোলা যায়। প্রকৃত ডেটা সবসময় Firebase থেকে
// লাইভ আনা হয় (ক্যাশ করা হয় না), তাই ডেটা সবসময় সবচেয়ে আপডেটেড থাকে।

// ⚠️ নতুন ভার্সন ডিপ্লয় করার সময় CACHE_NAME-এর সংখ্যা বাড়িয়ে দিন,
// নাহলে পুরনো ব্যবহারকারীরা ক্যাশ করা পুরনো index.html দেখতে পারেন।
const CACHE_NAME = "swapnaghuri-shell-v2";

const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

// ইনস্টল — অ্যাপ শেল ক্যাশ করা
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// অ্যাক্টিভেট — পুরনো ক্যাশ মুছে ফেলা
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ফেচ — HTML পেজের জন্য "নেটওয়ার্ক আগে, ব্যর্থ হলে ক্যাশ" কৌশল
// (যাতে অনলাইন থাকলে সবসময় সর্বশেষ ভার্সন দেখা যায়, অফলাইনে পুরনোটা কাজ চালায়)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // শুধু GET রিকোয়েস্ট হ্যান্ডল করা; Firebase/API কলগুলো (POST ইত্যাদি) স্পর্শ করা হবে না
  if (req.method !== "GET") return;

  // Firebase বা অন্য কোনো external API/database রিকোয়েস্ট — সরাসরি নেটওয়ার্কে যেতে দাও, ক্যাশ করো না
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("./index.html")))
    );
    return;
  }

  // অন্যান্য স্ট্যাটিক ফাইল (আইকন, ম্যানিফেস্ট) — আগে ক্যাশ, না পেলে নেটওয়ার্ক
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
