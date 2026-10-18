/* ==========================================================
   🏙️ TAKİPÇİ ŞEHRİ — 3D oyun çekirdeği (Three.js)
   Yorum yapan herkese, yazdığı ilde bir ev. Türkiye 81 ilde birden büyür.

   Yeni şey eklemek kolay:
   • Yeni yapı  → BUILDINGS içine bir giriş ekle (w, h, build)
   • Hazır 3D model → models/ klasörüne .glb koy, panelden "3D Model" ile yerleştir
   • Yeni olay  → EVENTS içine bir giriş ekle (run)
   Yönetici paneli: adresin sonuna ?admin ekle.
   ========================================================== */
import * as THREE from 'three';

// ---------- Temel ayarlar ----------
const IS_ADMIN = /admin/i.test(location.hash + location.search);
const STORAGE_KEY = 'takipciSehri.v1';
const K = 160;              // 1 derece ≈ 160 hücre
const B = 5;                // ızgara blok: 4x4 hücre + 1 hücre yol
const D = 20, DC = 10.5;    // mahalle: 20x20 hücre (4x4 blok), kenarları ana cadde
const LON0 = 24.5, LON1 = 46.5, LAT0 = 34.7, LAT1 = 43.5;
const COSL = Math.cos(39 * Math.PI / 180);
const G = 4;                // arazi ızgarası: 4 hücrede bir köşe
const W = Math.ceil((LON1 - LON0) * COSL * K / G) * G;
const H = Math.ceil((LAT1 - LAT0) * K / G) * G;
const GW = W / G + 1, GH = H / G + 1;
const WORLD_VERSION = 4;    // harita üretimi değişirse evlerin yeri kayar: gerçek veri girdikten sonra DEĞİŞTİRME
const unproj = (x, z) => [x / (COSL * K) + LON0, LAT1 - z / K];
const proj = (lon, lat) => [(lon - LON0) * COSL * K, (LAT1 - lat) * K];

// ---------- Harita (basitleştirilmiş Türkiye sınırı, [boylam, enlem]) ----------
const TURKEY = [
  [26.04,40.73],[26.35,41.25],[26.32,41.71],[26.6,41.95],[27.05,42.09],[27.55,41.95],[28.02,41.98],
  [28.15,41.6],[28.6,41.35],[29.1,41.24],[29.9,41.16],[30.6,41.15],[31.3,41.1],[31.8,41.45],[32.4,41.76],
  [33.0,41.97],[33.6,42.02],[34.3,41.96],[34.93,42.08],[35.2,42.0],[35.5,41.7],[36.05,41.7],[36.35,41.3],
  [36.8,41.35],[37.1,41.15],[37.7,41.05],[38.4,40.93],[39.1,41.05],[39.72,41.0],[40.5,41.04],[41.0,41.22],
  [41.55,41.52],[42.0,41.5],[42.5,41.45],[42.85,41.58],[43.2,41.3],[43.47,41.12],[43.6,40.75],[43.7,40.4],
  [43.65,40.12],[44.1,40.02],[44.5,39.85],[44.78,39.7],[44.55,39.4],[44.4,39.0],[44.25,38.7],[44.35,38.35],
  [44.25,38.05],[44.5,37.75],[44.6,37.45],[44.79,37.17],[44.3,37.05],[43.7,37.25],[43.1,37.36],[42.75,37.35],
  [42.36,37.11],[41.6,37.08],[41.0,37.08],[40.2,36.95],[39.6,36.75],[38.9,36.7],[38.2,36.9],[37.7,36.75],
  [37.1,36.65],[36.68,36.83],[36.6,36.5],[36.68,36.25],[36.4,36.2],[36.15,35.82],[35.92,35.92],[35.97,36.08],
  [36.17,36.58],[36.2,36.9],[35.8,36.78],[35.38,36.56],[35.0,36.72],[34.62,36.8],[34.2,36.55],[33.9,36.3],
  [33.4,36.15],[32.8,36.02],[32.3,36.3],[32.0,36.53],[31.4,36.78],[30.75,36.88],[30.55,36.5],[30.4,36.2],
  [29.65,36.18],[29.1,36.6],[28.7,36.72],[28.2,36.65],[27.45,36.68],[27.6,36.95],[27.25,37.0],[27.3,37.35],
  [27.15,37.7],[26.6,38.1],[26.25,38.3],[26.6,38.45],[26.75,38.62],[26.75,39.0],[26.95,39.3],[26.6,39.42],
  [26.07,39.48],[26.15,39.97],[26.2,40.1],[26.6,40.4],[26.75,40.55],[26.3,40.6]
];
const MARMARA = [[26.68,40.4],[27.0,40.62],[27.5,40.97],[28.0,41.0],[28.6,40.97],[29.0,41.02],[29.3,40.85],
  [29.9,40.73],[29.4,40.67],[29.1,40.42],[28.6,40.37],[28.0,40.4],[27.6,40.33],[27.2,40.42],[26.85,40.33]];
const VAN = [[42.3,38.65],[42.55,38.9],[42.95,38.97],[43.3,38.85],[43.45,38.55],[43.1,38.38],[42.7,38.45]];
const TUZ = [[33.2,39.05],[33.45,38.98],[33.6,38.62],[33.42,38.45],[33.25,38.62]];
const TR_ISLANDS = [
  [[25.65,40.2],[25.98,40.24],[26.0,40.12],[25.75,40.08]],                 // Gökçeada
  [[25.97,39.85],[26.1,39.85],[26.07,39.78],[25.98,39.79]],                 // Bozcaada
];
const MARMARA_ADA = [[27.45,40.65],[27.75,40.65],[27.7,40.57],[27.5,40.57]];
const LAKES = [VAN,
  [[31.35,37.85],[31.6,37.85],[31.65,37.6],[31.4,37.55]],                    // Beyşehir
  [[30.8,38.1],[30.95,38.05],[30.9,37.85],[30.78,37.9]],                     // Eğirdir
  [[29.45,40.47],[29.6,40.46],[29.6,40.4],[29.42,40.42]],                    // İznik
  [[30.15,40.74],[30.32,40.74],[30.32,40.7],[30.15,40.7]],                   // Sapanca
  [[30.0,37.75],[30.25,37.8],[30.25,37.7],[30.05,37.68]],                    // Burdur
  [[28.3,40.2],[28.6,40.2],[28.6,40.12],[28.3,40.12]],                       // Uluabat
  [[38.3,37.55],[38.7,37.6],[38.95,37.92],[38.75,37.88],[38.5,37.62]],       // Atatürk Barajı
  [[38.7,38.82],[39.3,38.87],[39.55,38.72],[39.0,38.74]],                    // Keban
];
// nehirler: [noktalar, genişlik (hücre)]
const RIVERS = [
  [[[38.3,39.9],[37.0,39.75],[36.0,39.3],[35.3,38.95],[34.6,39.1],[34.0,39.4],[33.5,39.85],[33.7,40.4],[34.3,40.9],[34.9,41.2],[35.5,41.4],[35.95,41.72]], 2.6], // Kızılırmak
  [[[37.4,40.1],[36.55,40.32],[35.85,40.65],[36.2,40.9],[36.6,41.2],[36.75,41.38]], 2.2],   // Yeşilırmak
  [[[31.0,39.3],[31.7,39.5],[32.1,39.65],[31.9,39.9],[31.0,40.0],[30.4,40.1],[30.0,40.35],[30.3,40.6],[30.5,40.85],[30.65,41.12]], 2.2], // Sakarya
  [[[40.5,39.6],[39.5,39.6],[39.0,39.1],[38.8,38.7],[38.9,38.3],[38.6,37.9],[38.4,37.5],[38.0,37.1],[38.0,36.6]], 2.8],  // Fırat
  [[[39.6,38.45],[40.0,38.1],[40.25,37.9],[40.8,37.8],[41.4,37.7],[41.9,37.45],[42.2,37.3],[42.4,37.0]], 2.6],          // Dicle
  [[[29.9,38.25],[29.3,37.95],[28.6,37.9],[27.9,37.83],[27.3,37.55]], 2.0],                  // Büyük Menderes
  [[[29.4,38.9],[28.6,38.5],[27.4,38.55],[26.85,38.62]], 2.0],                               // Gediz
];
// denizler (komşu kıyıları kabaca) ve yabancı adalar
const TR_COAST_N = TURKEY.slice(6, 32);
const iHatay = TURKEY.findIndex(p => p[0] === 35.92 && p[1] === 35.92);
const BLACK_SEA = [...TR_COAST_N, [41.65,41.9],[41.6,42.5],[41.4,43.6],[27.95,43.6],[27.9,42.9],[27.45,42.5],[27.75,42.3]];
const MED_SEA = [[26.04,40.73], ...TURKEY.slice(iHatay).reverse(), [35.9,35.4],[35.85,34.6],[24.4,34.6],[24.4,40.85],[24.9,40.9],[25.5,40.92]];
const FOREIGN_ISLANDS = [
  [[25.85,39.25],[26.2,39.38],[26.6,39.28],[26.4,39.0],[25.9,39.1]], [[25.85,38.55],[26.15,38.58],[26.15,38.25],[25.9,38.3]],
  [[26.55,37.8],[27.05,37.75],[26.95,37.65],[26.6,37.68]], [[26.95,36.85],[27.35,36.9],[27.15,36.75]],
  [[27.7,36.3],[28.25,36.45],[28.15,36.1],[27.75,35.9]], [[25.0,39.95],[25.4,40.0],[25.35,39.8],[25.1,39.8]],
  [[24.6,40.8],[24.8,40.75],[24.75,40.6]], [[24.5,35.4],[25.5,35.35],[26.3,35.3],[26.2,35.0],[25.0,35.0],[24.5,35.15]],
  [[32.27,35.1],[32.9,35.4],[33.6,35.36],[34.6,35.69],[34.0,35.1],[33.9,34.97],[33.0,34.56],[32.4,34.75]],
];
// dağ sıraları: [noktalar, yükseklik, genişlik (hücre)]
const RIDGES = [
  [[[30.4,40.85],[31.8,41.2],[33.5,41.45],[35.0,41.35],[36.5,40.85],[38.5,40.55],[40.0,40.65],[41.2,40.9],[42.2,41.2]], 7, 36],  // Kuzey Anadolu Dağları
  [[[40.6,40.75],[41.3,40.9],[41.8,41.1]], 8, 18],                                                                                  // Kaçkarlar
  [[[29.2,36.75],[30.0,37.1],[30.6,37.35],[31.4,37.15],[32.3,36.95],[33.3,36.95],[34.3,37.25],[35.2,37.7],[36.2,38.0],[37.4,38.25],[38.6,38.45],[39.8,38.55],[41.0,38.45],[42.4,38.05],[43.5,37.7],[44.3,37.4]], 10, 42], // Toroslar
  [[[34.9,37.6],[35.3,37.9]], 13, 16],                                                                                               // Aladağlar
  [[[27.5,38.3],[28.7,38.35]], 6, 14], [[[27.6,37.95],[28.6,37.95]], 5, 12],                                                         // Bozdağlar, Aydın
  [[[28.4,39.0],[29.3,39.2],[30.2,39.3]], 5, 20],
  [[[40.0,39.9],[41.5,40.3],[42.7,40.35]], 7, 30],
  [[[40.5,43.4],[42.5,43.0],[44.5,42.7],[46.5,42.2]], 14, 40],                                                                       // Kafkaslar
  [[[45.0,38.3],[45.6,37.0],[46.5,36.0]], 10, 40],                                                                                   // Zagros
  [[[23.5,41.7],[25.0,41.5],[26.0,41.6]], 6, 30], [[[23,42.75],[25,42.75],[27,42.7]], 6, 25],                                        // Rodoplar, Balkanlar
];
const PEAKS = [[44.3,39.7,22,22],[42.83,38.93,14,14],[42.23,38.65,8,10],[35.45,38.53,15,16],[34.17,38.13,10,11],[29.2,40.07,9,16],[39.8,37.65,4,14],[41.1,40.83,6,10]];
const pr = r => r.map(p => proj(p[0], p[1]));
const TR_OUTLINE = pr(TURKEY);
function meander(pts, seed) {   // nehri hücre ölçeğinde kıvrımlandır (sabit tohum → hep aynı)
  const q = pr(pts), out = []; let s = 0;
  for (let i = 1; i < q.length; i++) {
    const [ax, az] = q[i - 1], [bx, bz] = q[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 2.5));
    const nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (let k = (i === 1 ? 0 : 1); k <= n; k++) {
      const t = k / n, end = (i === 1 && k === 0) || (i === q.length - 1 && k === n);
      const off = end ? 0 : Math.sin((s + t * L) * .09 + seed) * 4.5 + (vnoise((s + t * L) * .03, seed) - .5) * 9;
      out.push([lerp(ax, bx, t) + nx * off, lerp(az, bz, t) + nz * off]);
    }
    s += L;
  }
  return out;
}
let RIVER_PATHS = null;

// 81 il, plaka sırasıyla: [ad, boylam, enlem, nüfus (100 bin)]
const PROVINCES = [
  ['Adana',35.32,37.0,22],['Adıyaman',38.28,37.76,6],['Afyonkarahisar',30.54,38.76,7],['Ağrı',43.05,39.72,5],['Amasya',35.83,40.65,3],
  ['Ankara',32.85,39.93,58],['Antalya',30.71,36.92,27],['Artvin',41.82,41.18,2],['Aydın',27.84,37.85,11],['Balıkesir',27.88,39.65,12],
  ['Bilecik',29.98,40.14,2],['Bingöl',40.5,38.88,3],['Bitlis',42.11,38.4,4],['Bolu',31.61,40.73,3],['Burdur',30.29,37.72,3],
  ['Bursa',29.06,40.19,32],['Çanakkale',26.41,40.15,5],['Çankırı',33.62,40.6,2],['Çorum',34.95,40.55,5],['Denizli',29.09,37.78,10],
  ['Diyarbakır',40.23,37.91,18],['Edirne',26.56,41.68,4],['Elazığ',39.22,38.67,6],['Erzincan',39.49,39.75,2],['Erzurum',41.27,39.9,7],
  ['Eskişehir',30.52,39.78,9],['Gaziantep',37.38,37.06,21],['Giresun',38.39,40.88,4],['Gümüşhane',39.48,40.46,1.5],['Hakkari',43.74,37.58,3],
  ['Hatay',36.16,36.22,17],['Isparta',30.55,37.76,4],['Mersin',34.63,36.83,19],['İstanbul',28.98,41.06,156],['İzmir',27.14,38.42,44],
  ['Kars',43.1,40.6,3],['Kastamonu',33.78,41.38,4],['Kayseri',35.49,38.73,14],['Kırklareli',27.22,41.73,4],['Kırşehir',34.16,39.15,2],
  ['Kocaeli',29.92,40.8,21],['Konya',32.49,37.87,23],['Kütahya',29.98,39.42,6],['Malatya',38.31,38.35,8],['Manisa',27.43,38.61,15],
  ['Kahramanmaraş',36.94,37.58,12],['Mardin',40.74,37.31,9],['Muğla',28.36,37.22,10],['Muş',41.49,38.75,4],['Nevşehir',34.71,38.62,3],
  ['Niğde',34.68,37.97,4],['Ordu',37.88,40.95,8],['Rize',40.52,40.99,3],['Sakarya',30.4,40.78,11],['Samsun',36.33,41.26,14],
  ['Siirt',41.94,37.93,3],['Sinop',35.15,41.98,2],['Sivas',37.02,39.75,6],['Tekirdağ',27.51,40.98,11],['Tokat',36.55,40.31,6],
  ['Trabzon',39.72,40.97,8],['Tunceli',39.55,39.11,1],['Şanlıurfa',38.79,37.16,22],['Uşak',29.41,38.68,4],['Van',43.38,38.5,11],
  ['Yozgat',34.81,39.82,4],['Zonguldak',31.79,41.43,6],['Aksaray',34.03,38.37,4],['Bayburt',40.23,40.26,1],['Karaman',33.21,37.18,3],
  ['Kırıkkale',33.52,39.85,3],['Batman',41.13,37.88,6],['Şırnak',42.46,37.52,5],['Bartın',32.34,41.63,2],['Ardahan',42.7,41.11,1],
  ['Iğdır',44.04,39.92,2],['Yalova',29.27,40.65,3],['Karabük',32.62,41.2,2],['Kilis',37.12,36.72,1.5],['Osmaniye',36.25,37.07,5],['Düzce',31.16,40.84,4]
].map((c, i) => ({ i, name: c[0], x: proj(c[1], c[2])[0], y: proj(c[1], c[2])[1], pop: c[3], big: c[3] >= 14 }));
const NP = PROVINCES.length;
const provIndex = name => Math.max(0, PROVINCES.findIndex(p => p.name === name));

// ---------- Yorumdan il bulma ----------
const norm = s => String(s).toLocaleLowerCase('tr-TR').replace(/[çğıöşüâîû]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }[c])).replace(/̇/g, '');
const ALIASES = { antep: 'Gaziantep', maras: 'Kahramanmaraş', urfa: 'Şanlıurfa', afyon: 'Afyonkarahisar', izmit: 'Kocaeli', gebze: 'Kocaeli',
  adapazari: 'Sakarya', antakya: 'Hatay', iskenderun: 'Hatay', icel: 'Mersin', tarsus: 'Mersin', ist: 'İstanbul', stanbul: 'İstanbul',
  kadikoy: 'İstanbul', besiktas: 'İstanbul', uskudar: 'İstanbul', esenyurt: 'İstanbul', bakirkoy: 'İstanbul', pendik: 'İstanbul', beylikduzu: 'İstanbul',
  sisli: 'İstanbul', fatih: 'İstanbul', maltepe: 'İstanbul', atasehir: 'İstanbul', umraniye: 'İstanbul', bagcilar: 'İstanbul', avcilar: 'İstanbul',
  karsiyaka: 'İzmir', bornova: 'İzmir', buca: 'İzmir', cesme: 'İzmir', cankaya: 'Ankara', kecioren: 'Ankara', etimesgut: 'Ankara', sincan: 'Ankara',
  nilufer: 'Bursa', osmangazi: 'Bursa', inegol: 'Bursa', alanya: 'Antalya', manavgat: 'Antalya', bodrum: 'Muğla', fethiye: 'Muğla', marmaris: 'Muğla',
  corlu: 'Tekirdağ', selcuklu: 'Konya', eregli: 'Zonguldak', polatli: 'Ankara', kusadasi: 'Aydın', ayvalik: 'Balıkesir', edremit: 'Balıkesir' };
const PROV_KEYS = [...PROVINCES.map(p => [norm(p.name), p.i]), ...Object.entries(ALIASES).map(([k, v]) => [k, provIndex(v)])]
  .sort((a, b) => b[0].length - a[0].length);
function detectProvince(text) {
  const toks = norm(text).split(/[^a-z0-9]+/).filter(Boolean);
  for (const t of toks) for (const [k, p] of PROV_KEYS)
    if (t.startsWith(k) && t.length <= k.length + (k.length <= 4 ? 5 : 7)) return p;
  for (const t of toks) { const m = t.match(/^(\d{1,2})(?:[a-z]{0,4})$/); if (m && +m[1] >= 1 && +m[1] <= NP) return +m[1] - 1; }
  return -1;
}

// ---------- Renkler (referans videonun paleti) ----------
const FOG = '#c3c6be';
const SEA = '#5b9fc4';
const GRASS = [124, 164, 42];
const PARK_RGB = [150, 192, 84];
const ROAD_RGB = [96, 99, 104];
const WALL_HEX = ['#f4f4f2','#f0f0ee','#fafaf8','#ecebe7','#f4f4f2','#e9e7e1','#f6f6f4','#e4e6e8'];
const ROOF_LIGHT = ['#d8dadc','#cfd2d5','#e0e1e2'];
const ROOF_DARK = ['#3c4148','#454a52','#33373d'];
const CAR_HEX = ['#f2f2f2','#e8e8e8','#c9ccd0','#9da3aa','#f2f2f2','#5a6068','#e8e8e8','#b8bcc2'];
const TREE_HEX = ['#3f7d2c','#4b8a33','#367026','#58933a'];
const COLOR_NAMES = { mor: '#8e44ad', kırmızı: '#d0413a', kirmizi: '#d0413a', mavi: '#2f80ed', yeşil: '#27ae60', yesil: '#27ae60',
  sarı: '#f2c94c', sari: '#f2c94c', turuncu: '#f2994a', pembe: '#e46a9b', siyah: '#2b2f36', beyaz: '#f4f4f2', gri: '#8a9097',
  altın: '#d4a72c', altin: '#d4a72c', lacivert: '#1f3a68', turkuaz: '#1abc9c', kahverengi: '#7a5a44' };
const parseColor = s => { s = (s || '').trim().toLocaleLowerCase('tr-TR'); return COLOR_NAMES[s] || (/^#[0-9a-f]{6}$/.test(s) ? s : ''); };

// ---------- Yardımcılar ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => Math.round(n).toLocaleString('tr-TR');
const easeInOut = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
const easeOutBack = t => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); };
const today = () => new Date().toISOString().slice(0, 10);
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash2(xi,yi), b = hash2(xi+1,yi), c = hash2(xi,yi+1), d = hash2(xi+1,yi+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
const fbm = (x, y) => vnoise(x,y)*0.6 + vnoise(x*2.3+17,y*2.3+9)*0.3 + vnoise(x*5.1+3,y*5.1+41)*0.1;
const roofDark = h => hash2(h, 21) < 0.3;
const roofHex = h => roofDark(h) ? ROOF_DARK[Math.floor(hash2(h,7)*3)] : ROOF_LIGHT[Math.floor(hash2(h,7)*3)];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ==========================================================
//  ORGANİK MAHALLE ŞABLONLARI
//  Her şablon 20x20'lik bir mahallenin yollarını ve ev yerlerini tanımlar.
//  Kanonik yönde giriş güneydedir (z=20.5); mahalle il merkezine bakacak şekilde döndürülür.
// ==========================================================
function mkRoad(pts, kind, o = {}) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1], kind, render: o.render !== false, base: o.base || 0, sym: !!o.sym };
}
function sampleRoad(r, s) {
  s = clamp(s, 0, r.L); let lo = 0, hi = r.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] <= s) lo = m; else hi = m; }
  const a = r.pts[lo], b = r.pts[hi], len = (r.cum[hi] - r.cum[lo]) || 1, t = (s - r.cum[lo]) / len;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / len, (b[1] - a[1]) / len];
}
const keyAt = (r, s) => r.base + (r.sym ? Math.min(s, r.L - s) : s);
function distToRoad(r, x, z) {
  let best = 1e9;
  for (let i = 1; i < r.pts.length; i++) {
    const [ax, az] = r.pts[i - 1], [bx, bz] = r.pts[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) best = d;
  }
  return best;
}
const bez = (p0, p1, p2, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t;
  return [u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]]; });
const ellipsePts = (rx, rz, n = 72) => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI / 2 + i / n * Math.PI * 2;
  return [DC + Math.cos(a) * rx, DC + Math.sin(a) * rz]; });

function buildTemplate(type, v) {
  const roads = [], discs = [], parks = [], trees = [];
  if (type === 'ring') {            // halka sokak + ortada park + köşelerde çıkmazlar
    const rx = [6.2, 7.2, 5.4][v], rz = [6.2, 5.0, 7.0][v];
    const c1 = mkRoad([[DC, 20.5], [DC, DC + rz]], 'spine');
    const ring = mkRoad(ellipsePts(rx, rz), 'ring', { base: c1.L, sym: true });
    roads.push(c1, ring, mkRoad([[DC, DC - rz], [DC, .5]], 'spine', { base: c1.L + ring.L / 2 }));
    if (v !== 1) roads.push(mkRoad([[DC - rx, DC], [.5, DC]], 'spine', { base: c1.L + ring.L / 4 }),
                            mkRoad([[DC + rx, DC], [20.5, DC]], 'spine', { base: c1.L + ring.L / 4 }));
    for (const [cx, cz] of [[3.7, 3.7], [17.3, 3.7], [3.7, 17.3], [17.3, 17.3]]) {
      const th = Math.atan2(cz - DC, cx - DC), st = [DC + Math.cos(th) * rx, DC + Math.sin(th) * rz];
      const sArc = ((th - Math.PI / 2 + Math.PI * 4) % (Math.PI * 2)) / (Math.PI * 2) * ring.L, base = c1.L + Math.min(sArc, ring.L - sArc);
      const br = mkRoad(bez(st, [(st[0] + cx) / 2 + (cz - DC) * .12, (st[1] + cz) / 2 - (cx - DC) * .12], [cx, cz], 14), 'cul', { base });
      if (br.L < 2.2) continue;
      roads.push(br); discs.push({ x: cx, z: cz, r: 1.0, key: base + br.L, road: roads.length - 1 });
    }
    const p = { x: DC, z: DC, rx: rx - 2.15, rz: rz - 2.15, key: c1.L + ring.L / 4 }; parks.push(p);
    for (let i = 0; i < 14; i++) { const a = hash2(i, v * 7 + 1) * Math.PI * 2, r = Math.sqrt(hash2(v, i * 3 + 2)) * .78;
      trees.push([DC + Math.cos(a) * p.rx * r, DC + Math.sin(a) * p.rz * r, 1 + hash2(i, 9) * .5]); }
  } else if (type === 'cul') {      // ana cadde + dönüş adalı çıkmaz sokaklar
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([DC + (v === 1 ? 1.4 * Math.sin(u * Math.PI * 1.4) : 0), lerp(20.5, 3.4, u)]); }
    const sp = mkRoad(pts, 'spine'); roads.push(sp);
    const e = sp.pts[sp.pts.length - 1]; discs.push({ x: e[0], z: e[1], r: 1.25, key: sp.L, road: 0 });
    const zs = v === 2 ? [16.4, 11.4, 6.8] : [15.2, 8.8];
    for (const z of zs) {
      const sJ = 20.5 - z, [jx, jz] = sampleRoad(sp, sJ);
      for (const side of [-1, 1]) {
        const end = [DC + side * 7.4, z - 1.4], ctrl = [jx + side * 3.4, z + .9];
        const br = mkRoad(bez([jx, jz], ctrl, end, 20), 'cul', { base: sJ }); roads.push(br);
        discs.push({ x: end[0], z: end[1], r: 1.1, key: sJ + br.L, road: roads.length - 1 });
      }
    }
  } else {                          // kıvrımlı sokaklar
    const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40;
      pts.push([DC + (v === 0 ? 4.4 * Math.sin(u * Math.PI) : 3.4 * Math.sin(u * Math.PI * 2)), lerp(20.5, .5, u)]); }
    roads.push(mkRoad(pts, 'curve'));
    roads.push(mkRoad(bez([.5, 7.5], [DC, v === 0 ? 2.2 : 13.8], [20.5, 7.5], 28), 'curve', { base: 12 }));
    roads.push(mkRoad(bez([.5, 15], [DC, v === 0 ? 19.5 : 11], [20.5, 15], 28), 'curve', { base: 4 }));
  }
  roads.push(mkRoad([[.5, 20.5], [20.5, 20.5]], 'perim', { render: false, base: 300 }),
             mkRoad([[.5, 20.5], [.5, .5]], 'perim', { render: false, base: 320 }),
             mkRoad([[20.5, 20.5], [20.5, .5]], 'perim', { render: false, base: 320 }),
             mkRoad([[.5, .5], [20.5, .5]], 'perim', { render: false, base: 340 }));

  const slots = [];
  const ok = (x, z) => x > 1.45 && x < 19.55 && z > 1.45 && z < 19.55
    && roads.every(r => distToRoad(r, x, z) >= .84)
    && discs.every(d => Math.hypot(x - d.x, z - d.z) >= d.r + .72)
    && parks.every(p => ((x - p.x) / (p.rx + .45)) ** 2 + ((z - p.z) / (p.rz + .45)) ** 2 >= 1)
    && slots.every(s => (s.x - x) ** 2 + (s.z - z) ** 2 >= .86);
  roads.forEach((r, ri) => { let k = 0;
    for (let s = .55; s <= r.L - .3; s += .98, k++) {
      const [x, z, tx, tz] = sampleRoad(r, s);
      for (const side of [1, -1]) {
        const px = x - tz * side * .95, pz = z + tx * side * .95;
        if (!ok(px, pz)) continue;
        slots.push({ x: px, z: pz, rot: Math.atan2(tz * side, -tx * side), road: ri, no: 2 * k + (side > 0 ? 1 : 2), key: keyAt(r, s) + (side > 0 ? 0 : .01) });
      }
    } });
  discs.forEach(d => { const R = d.r + .95, n = Math.floor(Math.PI * 2 * R / .98);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, px = d.x + Math.cos(a) * R, pz = d.z + Math.sin(a) * R;
      if (!ok(px, pz)) continue;
      slots.push({ x: px, z: pz, rot: Math.atan2(d.x - px, d.z - pz), road: d.road, no: 50 + i, key: d.key + .5 }); } });
  slots.sort((a, b) => a.key - b.key);

  const keys = slots.map(s => s.key);
  const countLE = k => { let lo = 0, hi = keys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] <= k) lo = m + 1; else hi = m; } return lo; };
  const pieces = [], segCount = roads.map(() => 0);
  roads.forEach((r, ri) => { if (!r.render) return;
    for (let s = 0; s <= r.L; s += .25) { const [x, z, tx, tz] = sampleRoad(r, s); pieces.push({ k: 0, x, z, a: Math.atan2(-tz, tx), rc: countLE(keyAt(r, s)), road: ri }); segCount[ri]++; }
    for (let s = .35; s <= r.L - .2; s += .7) { const [x, z, tx, tz] = sampleRoad(r, s); pieces.push({ k: 1, x, z, a: Math.atan2(-tz, tx), rc: countLE(keyAt(r, s)) }); } });
  discs.forEach(d => pieces.push({ k: 2, x: d.x, z: d.z, r: d.r, rc: countLE(d.key) }));
  parks.forEach(p => pieces.push({ k: 3, x: p.x, z: p.z, rx: p.rx, rz: p.rz, rc: countLE(p.key) }));
  [0, 300, 320, 320, 340].forEach((k, side) => side && pieces.push({ k: 4, side: side - 1, rc: Math.max(0, countLE(k) - 6) }));
  pieces.sort((a, b) => a.rc - b.rc);
  return { type, v, roads, slots, pieces, trees, segCount, parkRC: parks.length ? countLE(parks[0].key) : 1e9 };
}
const TEMPLATES = {
  ring: [0, 1, 2].map(v => buildTemplate('ring', v)),
  cul: [0, 1, 2].map(v => buildTemplate('cul', v)),
  curvy: [0, 1].map(v => buildTemplate('curvy', v)),
};
function tf(d, x, z) {
  const dx = x - DC, dz = z - DC; let rx, rz;
  switch (d.k) { case 0: rx = dx; rz = dz; break; case 1: rx = dz; rz = -dx; break; case 2: rx = -dx; rz = -dz; break; default: rx = -dz; rz = dx; }
  return [d.ox + DC + rx, d.oz + DC + rz];
}

// ==========================================================
//  THREE.JS SAHNE
// ==========================================================
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG, 100, 1000);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
let vw = 1, vh = 1;

scene.add(new THREE.HemisphereLight('#eef2f5', '#6f8a2c', 1.15));
const sun = new THREE.DirectionalLight('#fff4e2', 3.1);
const SUN_DIR = new THREE.Vector3(-0.95, 0.72, 0.42).normalize();
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const off = document.createElement('canvas'); off.width = W; off.height = H;
const offCtx = off.getContext('2d');
const IMG = offCtx.createImageData(W, H);
const PIX = IMG.data;
let BASE = null, dirty = null, lastTex = 0;
const landTex = new THREE.CanvasTexture(off);
landTex.colorSpace = THREE.SRGBColorSpace;
landTex.anisotropy = 8;

function canvasTexEarly(w, h, draw, repeat, linear) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (!linear) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// 3D arazi: 4 hücrede bir köşe, yükseklik + şehir çevresinde düzleşme
const terrainGeo = new THREE.PlaneGeometry(W, H, GW - 1, GH - 1).rotateX(-Math.PI / 2).translate(W / 2, 0, H / 2);
const land = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ map: landTex, alphaMap: null, transparent: true, alphaTest: .02 }));
land.receiveShadow = true; land.castShadow = true;
scene.add(land);
// deniz: kıyıda turkuaz, açıkta lacivert, dalga parıltısı
const seaNormal = canvasTexEarly(256, 256, (g, w, h) => {
  const hgt = (x, y) => vnoise(x / 18, y / 18) * .6 + vnoise(x / 7 + 9, y / 7 + 3) * .4, img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = hgt((x + 1) % w, y) - hgt((x - 1 + w) % w, y), dy = hgt(x, (y + 1) % h) - hgt(x, (y - 1 + h) % h);
    const nx = -dx * 2.2, ny = -dy * 2.2, l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
    img.data[i] = (nx / l * .5 + .5) * 255; img.data[i + 1] = (ny / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, [W / 70, H / 70], true);
const seaNormalFar = seaNormal.clone(); seaNormalFar.repeat.set(1140, 1140); seaNormalFar.needsUpdate = true;
const seaCanvas = document.createElement('canvas'); seaCanvas.width = GW; seaCanvas.height = GH;
const seaColTex = new THREE.CanvasTexture(seaCanvas); seaColTex.colorSpace = THREE.SRGBColorSpace;
const seaMats = [];
const seaMat = o => { const m = new THREE.MeshPhongMaterial({ shininess: 60, specular: '#8fb6cf', normalScale: new THREE.Vector2(.5, .5), ...o }); seaMats.push(m); return m; };
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(W, H).rotateX(-Math.PI / 2).translate(W / 2, -.12, H / 2), seaMat({ map: seaColTex, normalMap: seaNormal })));
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000).rotateX(-Math.PI / 2).translate(W / 2, -.2, H / 2), seaMat({ color: '#24649f', normalMap: seaNormalFar })));
// bulutlar (uzaktan bakınca)
const cloudTex = canvasTexEarly(128, 128, g => {
  for (let i = 0; i < 9; i++) { const x = 30 + Math.random() * 68, y = 40 + Math.random() * 48, r = 18 + Math.random() * 22;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
});
const clouds = [];
for (let i = 0; i < 18; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  const s = 160 + hash2(i, 5) * 260; sp.scale.set(s, s * .62, 1);
  sp.position.set(hash2(i, 1) * W, 120 + hash2(i, 2) * 80, hash2(i, 3) * H); scene.add(sp); clouds.push(sp);
}
let borderLine = null;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const WIN = '#2c333c';
const texSide = canvasTex(128, 96, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = WIN; for (const x of [18, 54, 90]) g.fillRect(x, 30, 20, 30);
  g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, h - 8, w, 8);
});
const texFront = canvasTex(128, 96, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = WIN; g.fillRect(14, 30, 22, 30); g.fillRect(92, 30, 22, 30);
  g.fillStyle = '#2a2d31'; g.fillRect(54, 34, 20, 62);
  g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, h - 8, w, 8);
});
const texUpper = canvasTex(128, 96, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = WIN; for (const x of [16, 44, 72, 100]) g.fillRect(x, 26, 14, 36);
});
const matLambert = (o) => new THREE.MeshLambertMaterial(o);
const mWhite = matLambert({ color: '#ffffff' });
const wallMats = [matLambert({ map: texSide }), matLambert({ map: texSide }), mWhite, mWhite, matLambert({ map: texFront }), matLambert({ map: texSide })];
const upperMats = [0,0,0,0,0,0].map((_, i) => (i === 2 || i === 3) ? mWhite : matLambert({ map: texUpper }));
const boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
const geoSide = new THREE.BoxGeometry(1, .03, 1).translate(0, .015, 0);
const geoAsph = new THREE.BoxGeometry(1, .02, 1).translate(0, .03, 0);
const geoDash = new THREE.BoxGeometry(1, .005, 1).translate(0, .043, 0);
const geoSideC = geoSide.clone().translate(0, -.006, 0), geoAsphC = geoAsph.clone().translate(0, -.005, 0);

class Pool {
  constructor(geo, mat, { cast = true, receive = false, color = true, cap = 1024 } = {}) {
    Object.assign(this, { geo, mat, cast, receive, useColor: color, mesh: null, cap: 0, dirty: false });
    this.make(cap);
  }
  make(cap) {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.castShadow = this.cast; m.receiveShadow = this.receive; m.frustumCulled = false; m.count = 0;
    if (this.useColor) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    if (this.mesh) {
      m.instanceMatrix.array.set(this.mesh.instanceMatrix.array);
      if (this.useColor) m.instanceColor.array.set(this.mesh.instanceColor.array);
      m.count = this.mesh.count; scene.remove(this.mesh); this.mesh.dispose();
    }
    this.mesh = m; this.cap = cap; scene.add(m);
  }
  ensure(n) { if (n > this.cap) { let c = this.cap; while (c < n) c *= 2; this.make(c); } }
  set(i, mat) { this.ensure(i + 1); this.mesh.setMatrixAt(i, mat); if (i >= this.mesh.count) this.mesh.count = i + 1; this.dirty = true; }
  color(i, c) { this.ensure(i + 1); this.mesh.setColorAt(i, c); this.dirty = true; }
  flush() { if (!this.dirty) return; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; this.dirty = false; }
  clear() { this.mesh.count = 0; this.dirty = true; }
}
const SIDE_C = '#c8cbcd', ASPH_C = '#45484d';
const P = {
  wallA: new Pool(boxGeo, wallMats, { receive: true }),
  roofA: new Pool(boxGeo, mWhite, { receive: true }),
  wallB: new Pool(boxGeo, upperMats, { receive: true }),
  roofB: new Pool(boxGeo, mWhite, { receive: true }),
  side:  new Pool(geoSide, matLambert({ color: SIDE_C }), { cast: false, receive: true, color: false }),
  asph:  new Pool(geoAsph, matLambert({ color: ASPH_C }), { cast: false, receive: true, color: false }),
  dash:  new Pool(geoDash, matLambert({ color: '#f4f4f4' }), { cast: false, color: false }),
  cSide: new Pool(geoSideC, matLambert({ color: SIDE_C }), { cast: false, receive: true, color: false }),
  cAsph: new Pool(geoAsphC, matLambert({ color: ASPH_C }), { cast: false, receive: true, color: false }),
  cDash: new Pool(geoDash, matLambert({ color: '#f4f4f4' }), { cast: false, color: false }),
  dSide: new Pool(new THREE.CylinderGeometry(1, 1, .024, 32).translate(0, .012, 0), matLambert({ color: SIDE_C }), { cast: false, receive: true, color: false }),
  dAsph: new Pool(new THREE.CylinderGeometry(1, 1, .02, 32).translate(0, .025, 0), matLambert({ color: ASPH_C }), { cast: false, receive: true, color: false }),
  parkD: new Pool(new THREE.CylinderGeometry(1, 1, .02, 40).translate(0, .01, 0), matLambert({ color: '#9cc85c' }), { cast: false, receive: true, color: false }),
  trunk: new Pool(new THREE.CylinderGeometry(.035, .05, .26, 5).translate(0, .13, 0), matLambert({ color: '#6b5138' }), { color: false }),
  leaf:  new Pool(new THREE.ConeGeometry(.2, .5, 6).translate(0, .45, 0), matLambert({ color: '#ffffff', flatShading: true })),
  fTrunk: new Pool(new THREE.CylinderGeometry(.035, .05, .26, 5).translate(0, .13, 0), matLambert({ color: '#6b5138' }), { color: false, cap: 8192 }),
  fPine: new Pool(new THREE.ConeGeometry(.2, .55, 6).translate(0, .48, 0), matLambert({ color: '#ffffff', flatShading: true }), { cap: 8192 }),
  fRound: new Pool(new THREE.IcosahedronGeometry(.25, 0).translate(0, .45, 0), matLambert({ color: '#ffffff', flatShading: true }), { cap: 8192 }),
  carB:  new Pool(new THREE.BoxGeometry(.36, .1, .18).translate(0, .07, 0), matLambert({ color: '#ffffff' })),
  carC:  new Pool(new THREE.BoxGeometry(.2, .085, .16).translate(-.02, .16, 0), matLambert({ color: '#30363d' }), { color: false }),
};

// Türkiye ölçeğinde her ilin üstünde ev sayısıyla büyüyen daire
const provDots = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, .5, 32), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .85, fog: false }), NP);
provDots.frustumCulled = false; provDots.count = 0; scene.add(provDots);
const provPulse = new Float32Array(NP), provLast = new Int32Array(NP);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
const _c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Matrix4().makeScale(0, 0, 0), QI = new THREE.Quaternion();

// ==========================================================
//  DÜNYA
//  Her ilin kendi ev sırası var (il merkezinden dışa doğru). Aynı veri → evler hep aynı yerde.
// ==========================================================
const LAND = new Uint8Array(W * H);
const STATE = new Uint8Array(W * H);        // 0 su, 1 boş, 2 ızgara yol, 3 ev, 4 yapı, 5 eğri yol/park
const CELL_HOUSE = new Int32Array(W * H);
const STAMP = new Uint8Array(W * H); let stampId = 0;
let SLOT_X, SLOT_Z, SLOT_ROT, SLOT_CELL, SLOT_DIST, SLOT_ROAD, SLOT_NO, SLOT_PROV, SLOT_TAKEN, NS = 0;
const PROV_START = new Int32Array(NP + 1), PROV_PTR = new Int32Array(NP), PROV_COUNT = new Int32Array(NP);
let PROV_BB = [];
let HOUSE_SLOT = new Int32Array(4096), HOUSE_CELL = new Int32Array(4096), HOUSE_OWNER = [];
let PARK = null, BW = 0, BH = 0, DW = 0, DH = 0, DGRID = null, CDIST = [];
let houseCount = 0, bbox = null;
let buildings = [], builtDistricts = [];
const bGroups = new Map();
const born = new Map();
let roadList = [];
const roadIdx = new Map();
const districts = new Map();
const cars = [];
let nSeg = 0, nDash = 0, nDisc = 0, nPark = 0;

// ---------- Harita: maskeler, yükseklik, bölge renkleri ----------
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
let KIND = null;                       // 0 su, 1 Türkiye, 2 komşu ülke, 3 tuz
let BASE0 = null;                      // değişmeyen zemin rengi (RGB)
const H0 = new Float32Array(GW * GH), FG = new Float32Array(GW * GH).fill(1), DENS = new Float32Array(GW * GH), ROUNDF = new Float32Array(GW * GH);
function fillRings(rings, mask, val = 1) {
  const xs = [];
  for (let y = 0; y < H; y++) {
    const yc = y + .5; xs.length = 0;
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [x1, y1] = r[i], [x2, y2] = r[j];
      if ((y1 > yc) !== (y2 > yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] - .5)), b = Math.min(W - 1, Math.floor(xs[k + 1] - .5));
      for (let x = a; x <= b; x++) mask[y * W + x] = val;
    }
  }
}
function distToPoly(pts, x, z) {
  let best = 1e9;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) best = d;
  }
  return best;
}
function chamfer(src) {
  const d = new Float32Array(GW * GH); for (let i = 0; i < d.length; i++) d[i] = src[i] ? 0 : 1e9;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = y * GW + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - GW] + 1); if (x > 0) v = Math.min(v, d[i - GW - 1] + 1.414); if (x < GW - 1) v = Math.min(v, d[i - GW + 1] + 1.414); }
    d[i] = v; }
  for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) { const i = y * GW + x; let v = d[i];
    if (x < GW - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < GH - 1) { v = Math.min(v, d[i + GW] + 1); if (x < GW - 1) v = Math.min(v, d[i + GW + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + GW - 1] + 1.414); }
    d[i] = v; }
  return d;
}
const C = { steppe: [196,186,104], east: [136,160,76], se: [204,176,114], med: [124,168,62], black: [70,140,52],
  rock: [140,128,110], snow: [245,247,250], sand: [226,210,165], salt: [238,234,228] };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function buildLand() {
  RIVER_PATHS = RIVERS.map(([pts, wd], i) => [meander(pts, i * 7.3 + 1), wd]);
  // maskeler
  const outer = new Uint8Array(W * H), sea = new Uint8Array(W * H), salt = new Uint8Array(W * H);
  fillRings([TURKEY, ...TR_ISLANDS].map(pr), outer);
  fillRings([TURKEY, ...TR_ISLANDS, MARMARA, MARMARA_ADA, ...LAKES].map(pr), LAND);
  fillRings([BLACK_SEA, MED_SEA, ...FOREIGN_ISLANDS].map(pr), sea);
  fillRings([pr(TUZ)], salt);
  KIND = new Uint8Array(W * H);
  for (let c = 0; c < W * H; c++) {
    if (salt[c] && LAND[c]) { LAND[c] = 0; KIND[c] = 3; }
    else KIND[c] = LAND[c] ? 1 : (!outer[c] && !sea[c]) ? 2 : 0;
  }
  for (const [P_, wd] of RIVER_PATHS) {   // nehirler: Türkiye içinde su
    for (let i = 1; i < P_.length; i++) {
      const [ax, az] = P_[i - 1], [bx, bz] = P_[i], r = wd / 2;
      for (let z = Math.floor(Math.min(az, bz) - r); z <= Math.max(az, bz) + r; z++) for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.max(ax, bx) + r; x++) {
        if (x < 0 || z < 0 || x >= W || z >= H) continue;
        const c = z * W + x; if (KIND[c] !== 1) continue;
        if (distToPoly([[ax, az], [bx, bz]], x + .5, z + .5) < r) { LAND[c] = 0; KIND[c] = 0; }
      }
    }
  }
  // kaba ızgara alanları
  const kAt = (ix, iy) => KIND[Math.min(H - 1, iy * G) * W + Math.min(W - 1, ix * G)];
  const water = new Uint8Array(GW * GH), black = new Uint8Array(GW * GH), med = new Uint8Array(GW * GH);
  for (let iy = 0; iy < GH; iy++) for (let ix = 0; ix < GW; ix++) {
    const i = iy * GW + ix, k = kAt(ix, iy), [lon, lat] = unproj(ix * G, iy * G);
    const inner = outer[Math.min(H - 1, iy * G) * W + Math.min(W - 1, ix * G)];
    water[i] = k === 0 || k === 3;
    if (k === 0 && !inner) { if (lat > 41.05 && lon > 27.9 && lon < 41.8) black[i] = 1; else med[i] = 1; }
  }
  const dW = chamfer(water), dB = chamfer(black), dM = chamfer(med);
  const trC = new Uint8Array(GW * GH); for (let iy = 0; iy < GH; iy++) for (let ix = 0; ix < GW; ix++) trC[iy * GW + ix] = kAt(ix, iy) === 1 || kAt(ix, iy) === 3;
  const dT = chamfer(trC); NFADE = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) NFADE[i] = sm(46, 12, dT[i]);
  dL = chamfer(water.map(v => v ? 0 : 1));
  const RP = RIDGES.map(([pts, h, w]) => { const q = pr(pts); const xs = q.map(p => p[0]), zs = q.map(p => p[1]);
    return { q, h, w, x0: Math.min(...xs) - w * 3, x1: Math.max(...xs) + w * 3, z0: Math.min(...zs) - w * 3, z1: Math.max(...zs) + w * 3 }; });
  const PK = PEAKS.map(([lo, la, h, w]) => { const [x, z] = proj(lo, la); return { x, z, h, w }; });
  const COL = new Float32Array(GW * GH * 3);
  for (let iy = 0; iy < GH; iy++) for (let ix = 0; ix < GW; ix++) {
    const i = iy * GW + ix, x = ix * G, z = iy * G, [lon, lat] = unproj(x, z), k = kAt(ix, iy);
    let h = 0;
    for (const r of RP) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) { const d = distToPoly(r.q, x, z); h += r.h * Math.exp(-((d / r.w) ** 2)); }
    let pk = 0; for (const p of PK) pk = Math.max(pk, p.h * Math.exp(-((Math.hypot(x - p.x, z - p.z) / p.w) ** 2)));
    const rug = 1 - Math.abs(2 * vnoise(x * .035, z * .035) - 1), det = fbm(x * .015, z * .015);
    const plateau = 1.4 * sm(36.7, 37.6, lat) * sm(41.6, 40.6, lat) * sm(29.5, 31, lon) + 2.8 * sm(38, 41, lon) * sm(42.6, 41.4, lat);
    h = h * (.45 + .9 * rug) + pk + plateau * (.8 + .4 * det) + .8 * det;
    const edge = Math.min(x, W - x, z, H - z);
    h *= sm(0, 5, dW[i]) * (k === 2 ? NFADE[i] : 1);
    const hRaw = water[i] ? 0 : Math.max(0, h); H0[i] = hRaw * 2.1;
    // bölge rengi
    const db = dB[i] * G, dm = dM[i] * G;
    const wB = sm(110, 25, db), wM = sm(90, 15, dm), wE = sm(37.8, 39.8, lon), wS = sm(38.3, 37.3, lat) * sm(36.3, 37.6, lon);
    let col = C.steppe; col = mixc(col, C.east, wE); col = mixc(col, C.se, wS); col = mixc(col, C.med, wM); col = mixc(col, C.black, wB);
    const rock = sm(9, 13.5, hRaw), snow = sm(16.5, 20, hRaw + (vnoise(x * .05, z * .05) - .5) * 3);
    col = mixc(col, C.rock, rock * .85); col = mixc(col, C.snow, snow);
    col = mixc(col, C.sand, sm(3.2, .9, dW[i] * G) * Math.max(wM, wB * .6) * (1 - rock));
    if (k === 2) { const gy = (col[0] + col[1] + col[2]) / 3; col = mixc(col, [gy, gy, gy], .55).map(v => v * .93); }
    COL[i * 3] = col[0]; COL[i * 3 + 1] = col[1]; COL[i * 3 + 2] = col[2];
    DENS[i] = k === 3 || water[i] ? 0 : (.035 + .6 * wB * (1 - rock) + .32 * wM * sm(1, 5, hRaw) * (1 - rock) + .06 * wE) * (1 - snow) * (k === 2 ? .5 : 1);
    ROUNDF[i] = wB * .65;
  }
  // deniz rengi
  const sctx = seaCanvas.getContext('2d'), simg = sctx.createImageData(GW, GH);
  for (let i = 0; i < GW * GH; i++) { const t = dL[i], ex = (i % GW) * G, ez = ((i / GW) | 0) * G, edge = Math.min(ex, W - ex, ez, H - ez);
    let c = mixc([96, 206, 214], mixc([58, 160, 205], [36, 100, 160], sm(4, 30, t)), sm(.5, 3, t));
    c = mixc([36, 100, 160], c, Math.min(sm(30, 160, edge), sm(58, 22, dT[i])));
    simg.data[i * 4] = c[0]; simg.data[i * 4 + 1] = c[1]; simg.data[i * 4 + 2] = c[2]; simg.data[i * 4 + 3] = 255; }
  sctx.putImageData(simg, 0, 0); seaColTex.needsUpdate = true;
  // hücre renkleri
  BASE0 = new Uint8ClampedArray(W * H * 3); BASE = new Uint8ClampedArray(W * H * 4);
  for (let z = 0; z < H; z++) {
    const iy = Math.min(GH - 2, (z / G) | 0), fz = z / G - iy;
    for (let x = 0; x < W; x++) {
      const c = z * W + x, k = KIND[c]; if (k === 0) continue;
      const ix = Math.min(GW - 2, (x / G) | 0), fx = x / G - ix, i = iy * GW + ix;
      const nz = 1 + (vnoise(x * .08, z * .08) - .5) * .1 + (hash2(x, z) - .5) * .015;
      for (let ch = 0; ch < 3; ch++) {
        let v = (COL[i * 3 + ch] * (1 - fx) + COL[(i + 1) * 3 + ch] * fx) * (1 - fz) + (COL[(i + GW) * 3 + ch] * (1 - fx) + COL[(i + GW + 1) * 3 + ch] * fx) * fz;
        if (k === 3) v = C.salt[ch];
        BASE0[c * 3 + ch] = v * nz;
      }
    }
  }
  // su hücrelerine kıyı rengi ver (yumuşak kenarda siyah halka olmasın)
  for (let c = 0; c < W * H; c++) if (KIND[c] === 0) { BASE0[c * 3] = 214; BASE0[c * 3 + 1] = 204; BASE0[c * 3 + 2] = 160; }
  buildAlpha(); land.material.alphaMap = alphaTex; land.material.needsUpdate = true;
  restoreBase();
  updateTerrain(0, 0, GW - 1, GH - 1);
  // Türkiye sınır çizgisi (arazinin üstünden)
  const pts = [];
  for (let i = 0; i < TR_OUTLINE.length; i++) {
    const [ax, az] = TR_OUTLINE[i], [bx, bz] = TR_OUTLINE[(i + 1) % TR_OUTLINE.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3));
    for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n;
      const x0 = lerp(ax, bx, t0), z0 = lerp(az, bz, t0), x1 = lerp(ax, bx, t1), z1 = lerp(az, bz, t1);
      pts.push(x0, heightAt(x0, z0) + .4, z0, x1, heightAt(x1, z1) + .4, z1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  borderLine = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .5, fog: false }));
  scene.add(borderLine);
}
let dL = null, NFADE = null;
// Pürüzsüz kıyı: Türkiye kenar yumuşatmalı (anti-aliased) çizilir, komşular uzaklaştıkça solar
const alphaCanvas = document.createElement('canvas'); alphaCanvas.width = W; alphaCanvas.height = H;
const alphaTex = new THREE.CanvasTexture(alphaCanvas);
function buildAlpha() {
  const g = alphaCanvas.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const path = rings => { g.beginPath(); for (const r of rings) { r.forEach(([x, z], i) => i ? g.lineTo(x, z) : g.moveTo(x, z)); g.closePath(); } };
  g.fillStyle = '#fff'; path([TURKEY, ...TR_ISLANDS, MARMARA, MARMARA_ADA, ...LAKES].map(pr)); g.fill('evenodd');
  g.globalCompositeOperation = 'destination-out'; g.lineCap = g.lineJoin = 'round';
  for (const [P_, wd] of RIVER_PATHS) { g.lineWidth = wd; g.beginPath(); P_.forEach(([x, z], i) => i ? g.lineTo(x + .0, z) : g.moveTo(x, z)); g.stroke(); }
  g.globalCompositeOperation = 'source-over';
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let z = 0; z < H; z++) { const iy = Math.min(GH - 1, Math.round(z / G));
    for (let x = 0; x < W; x++) { const c = z * W + x; if (KIND[c] !== 2) continue;
      const a = 255 * NFADE[iy * GW + Math.min(GW - 1, Math.round(x / G))], i = c * 4;
      if (a > d[i]) d[i] = d[i + 1] = d[i + 2] = a; } }
  g.putImageData(img, 0, 0); alphaTex.needsUpdate = true;
}
function restoreBase() {
  for (let c = 0; c < W * H; c++) { BASE[c * 4] = BASE0[c * 3]; BASE[c * 4 + 1] = BASE0[c * 3 + 1]; BASE[c * 4 + 2] = BASE0[c * 3 + 2]; BASE[c * 4 + 3] = 255; }
}
const terrY = i => H0[i] * FG[i];
function updateTerrain(ix0, iy0, ix1, iy1) {
  ix0 = Math.max(0, ix0); iy0 = Math.max(0, iy0); ix1 = Math.min(GW - 1, ix1); iy1 = Math.min(GH - 1, iy1);
  const pos = terrainGeo.attributes.position.array, nor = terrainGeo.attributes.normal.array;
  for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) { const i = iy * GW + ix; pos[i * 3 + 1] = terrY(i); }
  for (let iy = Math.max(0, iy0 - 1); iy <= Math.min(GH - 1, iy1 + 1); iy++) for (let ix = Math.max(0, ix0 - 1); ix <= Math.min(GW - 1, ix1 + 1); ix++) {
    const i = iy * GW + ix;
    const hl = terrY(iy * GW + Math.max(0, ix - 1)), hr = terrY(iy * GW + Math.min(GW - 1, ix + 1));
    const hu = terrY(Math.max(0, iy - 1) * GW + ix), hd = terrY(Math.min(GH - 1, iy + 1) * GW + ix);
    const nx = hl - hr, ny = 2 * G, nz = hu - hd, l = Math.hypot(nx, ny, nz);
    nor[i * 3] = nx / l; nor[i * 3 + 1] = ny / l; nor[i * 3 + 2] = nz / l;
  }
  terrainGeo.attributes.position.needsUpdate = true; terrainGeo.attributes.normal.needsUpdate = true;
}
function heightAt(x, z) {
  const fx = clamp(x / G, 0, GW - 1.001), fz = clamp(z / G, 0, GH - 1.001), ix = fx | 0, iy = fz | 0, tx = fx - ix, tz = fz - iy, i = iy * GW + ix;
  return (terrY(i) * (1 - tx) + terrY(i + 1) * tx) * (1 - tz) + (terrY(i + GW) * (1 - tx) + terrY(i + GW + 1) * tx) * tz;
}
const flatAt = (x, z) => { const ix = clamp(Math.round(x / G), 0, GW - 1), iy = clamp(Math.round(z / G), 0, GH - 1); return FG[iy * GW + ix]; };
// Şehir kurulan yer düzleşir ve yeşillenir; dağlar şehrin etrafında kalır
const flatDirty = new Set(); let lastFlat = 0;
const ZONE = [124, 164, 42];
function processFlatten(force) {
  if (!flatDirty.size) return;
  const now = performance.now(); if (!force && now - lastFlat < 300) return; lastFlat = now;
  let r0 = 1e9, r1 = -1, q0 = 1e9, q1 = -1;
  for (const pv of flatDirty) {
    const bb = PROV_BB[pv]; if (!bb) continue;
    const A = 22, Fo = 40, M = A + Fo;
    const ix0 = Math.max(0, Math.floor((bb.x0 - M) / G)), ix1 = Math.min(GW - 1, Math.ceil((bb.x1 + M) / G));
    const iy0 = Math.max(0, Math.floor((bb.y0 - M) / G)), iy1 = Math.min(GH - 1, Math.ceil((bb.y1 + M) / G));
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
      const x = ix * G, z = iy * G, dx = Math.max(bb.x0 - A - x, 0, x - (bb.x1 + A)), dz = Math.max(bb.y0 - A - z, 0, z - (bb.y1 + A));
      const d = Math.hypot(dx, dz), f = d <= 0 ? 0 : sm(0, Fo, d + (vnoise(x * .045, z * .045) - .5) * 34), i = iy * GW + ix; if (f < FG[i]) FG[i] = f;
    }
    r0 = Math.min(r0, ix0); r1 = Math.max(r1, ix1); q0 = Math.min(q0, iy0); q1 = Math.max(q1, iy1);
    for (let z = Math.max(0, bb.y0 - M); z <= Math.min(H - 1, bb.y1 + M); z++) for (let x = Math.max(0, bb.x0 - M); x <= Math.min(W - 1, bb.x1 + M); x++) {
      const c = z * W + x; if (KIND[c] !== 1) continue;
      const F = flatAt(x, z); if (F > .995) continue;
      const t = (1 - F) * .8, b = c * 4, o = c * 3;
      BASE[b] = BASE0[o] + (ZONE[0] - BASE0[o]) * t; BASE[b + 1] = BASE0[o + 1] + (ZONE[1] - BASE0[o + 1]) * t; BASE[b + 2] = BASE0[o + 2] + (ZONE[2] - BASE0[o + 2]) * t;
      const st = STATE[c]; if (st === 1 || st === 3 || st === 5) paintCell(c);
    }
  }
  flatDirty.clear();
  if (r1 >= 0) updateTerrain(r0, q0, r1, q1);
}
function nearestProv(x, y) { let best = 0, bd = 1e18;
  for (const p of PROVINCES) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p.i; } } return best; }

// Mahalle tiplerini seç; her ilin ev yerlerini il merkezinden dışa doğru sırala.
function buildOrder() {
  DW = Math.ceil(W / D); DH = Math.ceil(H / D);
  DGRID = new Int32Array(DW * DH).fill(-1); CDIST = [];
  for (let dz = 0; dz < DH; dz++) for (let dx = 0; dx < DW; dx++) {
    const ox = dx * D, oz = dz * D; let full = ox + D < W && oz + D < H;
    for (let y = oz; full && y <= oz + D; y++) for (let x = ox; x <= ox + D; x++) if (!LAND[y * W + x]) { full = false; break; }
    if (!full) continue;
    const h = hash2(dx * 13 + 5, dz * 29 + 11); if (h < .4) continue;
    const type = h < .62 ? 'ring' : h < .84 ? 'cul' : 'curvy', list = TEMPLATES[type];
    const T = list[Math.floor(hash2(dz * 7, dx * 3) * list.length)];
    const pv = nearestProv(ox + DC, oz + DC), c = PROVINCES[pv], vx = c.x - (ox + DC), vz = c.y - (oz + DC);
    const k = Math.abs(vx) > Math.abs(vz) ? (vx > 0 ? 1 : 3) : (vz > 0 ? 0 : 2);
    DGRID[dz * DW + dx] = CDIST.length;
    CDIST.push({ id: CDIST.length, ox, oz, k, T, pv, built: 0, pp: 0, art: false, segRev: new Int32Array(T.roads.length) });
  }
  BW = Math.ceil(W / B); BH = Math.ceil(H / B);
  const inner = (lx, ly) => lx >= 2 && lx <= 3 && ly >= 2 && ly <= 3;
  const cnt = new Uint8Array(BW * BH);
  for (let y = 0; y < H; y++) { if (y % B === 0) continue;
    for (let x = 0; x < W; x++) { if (x % B === 0 || !LAND[y*W+x] || inner(x % B, y % B)) continue; cnt[((y/B)|0)*BW + ((x/B)|0)]++; } }
  PARK = new Uint8Array(BW * BH);
  const units = PROVINCES.map(() => []); let total = 0;
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
    const n = cnt[by*BW+bx]; if (!n) continue;
    if (DGRID[((by * B / D) | 0) * DW + ((bx * B / D) | 0)] >= 0) continue;
    if (n === 12 && hash2(bx*3+1, by*7+2) < 0.045) { PARK[by*BW+bx] = 1; continue; }
    const cx = bx*B + B/2, cy = by*B + B/2, pv = nearestProv(cx, cy), c = PROVINCES[pv];
    units[pv].push([Math.hypot(cx - c.x, cy - c.y) * (0.3 + 1.4 * fbm(bx*0.09, by*0.09)) + hash2(bx, by)*6, 0, bx, by]); total += n;
  }
  CDIST.forEach((d, di) => {
    const c = PROVINCES[d.pv], nf = .3 + 1.4 * fbm((d.ox + DC) / B * .09, (d.oz + DC) / B * .09), S = d.T.slots; let prev = -1;
    for (let ch = 0; ch * 16 < S.length; ch++) {
      let sx = 0, sz = 0, n = 0;
      for (let j = ch * 16; j < Math.min(S.length, ch * 16 + 16); j++) { const [x, z] = tf(d, S[j].x, S[j].z); sx += x; sz += z; n++; }
      const key = Math.max(prev + .001, Math.hypot(sx / n - c.x, sz / n - c.y) * nf); prev = key;
      units[d.pv].push([key, 1, di, ch]);
    }
    total += S.length;
  });
  SLOT_X = new Float32Array(total); SLOT_Z = new Float32Array(total); SLOT_ROT = new Float32Array(total);
  SLOT_CELL = new Int32Array(total); SLOT_DIST = new Int32Array(total); SLOT_ROAD = new Int32Array(total);
  SLOT_NO = new Int16Array(total); SLOT_PROV = new Uint8Array(total); SLOT_TAKEN = new Uint8Array(total);
  let k = 0, curP = 0;
  const put = (x, z, rot, di, road, no) => { SLOT_X[k] = x; SLOT_Z[k] = z; SLOT_ROT[k] = rot; SLOT_CELL[k] = Math.floor(z) * W + Math.floor(x);
    SLOT_DIST[k] = di; SLOT_ROAD[k] = road; SLOT_NO[k] = no; SLOT_PROV[k] = curP; k++; };
  for (let pv = 0; pv < NP; pv++) {
    PROV_START[pv] = k; curP = pv;
    units[pv].sort((a, b) => a[0] - b[0]);
    for (const u of units[pv]) {
      if (u[1] === 0) { const bx = u[2], by = u[3];
        for (let y = by*B + 1; y < by*B + B && y < H; y++) for (let x = bx*B + 1; x < bx*B + B && x < W; x++) {
          const lx = x - bx*B, ly = y - by*B; if (inner(lx, ly) || !LAND[y*W + x]) continue;
          const hd = Math.min(lx, B - lx), vd = Math.min(ly, B - ly);
          put(x + .5, y + .5, hd < vd ? (lx <= 2 ? -Math.PI/2 : Math.PI/2) : (ly <= 2 ? Math.PI : 0), -1, by, (ly - 1) * 4 + lx);
        } }
      else { const d = CDIST[u[2]], S = d.T.slots;
        for (let j = u[3] * 16; j < Math.min(S.length, u[3] * 16 + 16); j++) { const s = S[j], [x, z] = tf(d, s.x, s.z); put(x, z, s.rot + d.k * Math.PI / 2, u[2], s.road, s.no); } }
    }
  }
  PROV_START[NP] = k; NS = k;
}

function markDirty(x, y) {
  if (!dirty) dirty = { x0: x, y0: y, x1: x, y1: y };
  else { if (x < dirty.x0) dirty.x0 = x; if (x > dirty.x1) dirty.x1 = x; if (y < dirty.y0) dirty.y0 = y; if (y > dirty.y1) dirty.y1 = y; }
}
function flushImage(force) {
  if (!dirty) return;
  const now = performance.now(); if (!force && now - lastTex < 180) return;
  offCtx.putImageData(IMG, 0, 0, dirty.x0, dirty.y0, dirty.x1 - dirty.x0 + 1, dirty.y1 - dirty.y0 + 1);
  dirty = null; lastTex = now; landTex.needsUpdate = true;
}
function paintCell(c, rgb) {
  const i = c * 4;
  if (!rgb) { { PIX[i] = BASE[i]; PIX[i+1] = BASE[i+1]; PIX[i+2] = BASE[i+2]; PIX[i+3] = BASE[i+3]; markDirty(c % W, (c / W) | 0); return; } }
  PIX[i] = rgb[0]; PIX[i+1] = rgb[1]; PIX[i+2] = rgb[2]; PIX[i+3] = 255;
  markDirty(c % W, (c / W) | 0);
}

function resetWorld() {
  STATE.set(LAND); CELL_HOUSE.fill(-1); SLOT_TAKEN.fill(0);
  for (let p = 0; p < NP; p++) PROV_PTR[p] = PROV_START[p];
  PROV_COUNT.fill(0); PROV_BB = PROVINCES.map(() => null); HOUSE_OWNER = [];
  houseCount = 0; bbox = null; buildings = []; builtDistricts = []; born.clear(); districts.clear();
  roadList = []; roadIdx.clear(); cars.length = 0; nSeg = nDash = nDisc = nPark = 0;
  for (const d of CDIST) { d.built = 0; d.pp = 0; d.art = false; d.segRev.fill(0); }
  for (const g of bGroups.values()) { scene.remove(g); g.traverse(o => o.geometry?.dispose()); }
  bGroups.clear();
  Object.values(P).forEach(p => p.clear());
  FG.fill(1); flatDirty.clear(); restoreBase(); updateTerrain(0, 0, GW - 1, GH - 1); forestKey = '';
  PIX.set(BASE); dirty = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
}
function nextFreeSlot(pv) {
  let i = PROV_PTR[pv]; const end = PROV_START[pv + 1];
  while (i < end && (SLOT_TAKEN[i] || STATE[SLOT_CELL[i]] === 4)) i++;
  PROV_PTR[pv] = i < end ? i + 1 : end;
  return i < end ? i : -1;
}
function peekCells(pv, n) {
  const out = []; let i = PROV_PTR[pv]; const end = PROV_START[pv + 1];
  while (out.length < n && i < end) { if (!SLOT_TAKEN[i] && STATE[SLOT_CELL[i]] !== 4) out.push(SLOT_CELL[i]); i++; }
  return out;
}
const housePos = h => { const s = HOUSE_SLOT[h]; return [SLOT_X[s], SLOT_Z[s]]; };
const houseProv = h => SLOT_PROV[HOUSE_SLOT[h]];

// ---------- Evler ----------
function houseMatrices(h, k) {
  const s = HOUSE_SLOT[h], x = SLOT_X[s], z = SLOT_Z[s], rot = SLOT_ROT[s];
  const r1 = hash2(h, 13), type = r1 < .24 ? 1 : r1 < .42 ? 2 : 0;
  const fw = type === 2 ? .5 : .56 + hash2(h, 5) * .14, fd = .5 + hash2(h, 9) * .12, ha = .36 + hash2(h, 4) * .06;
  const kk = Math.max(.001, k), drop = (1 - Math.min(1, k)) * 1.4;
  _q.setFromAxisAngle(UP, rot);
  const put = (pool, lx_, ly_, lz_, sx_, sy_, sz_) => {
    _v.set(lx_ * kk, ly_ * kk, lz_ * kk).applyQuaternion(_q);
    _p.set(x + _v.x, drop + _v.y, z + _v.z);
    _m.compose(_p, _q, _s.set(sx_ * kk, sy_ * kk, sz_ * kk)); pool.set(h, _m);
  };
  put(P.wallA, 0, 0, 0, fw, ha, fd);
  put(P.roofA, 0, ha, 0, fw + .05, .045, fd + .05);
  if (type === 1) { const uw = fw * .68, ud = fd * .78, uh = .3;
    put(P.wallB, -fw * .12, ha + .045, -fd * .06, uw, uh, ud);
    put(P.roofB, -fw * .12, ha + .045 + uh, -fd * .06, uw + .05, .04, ud + .05); }
  else if (type === 2) { const aw = .22, ad = fd * .72, ah = ha * .78;
    put(P.wallB, fw / 2 + aw / 2 - .01, 0, -fd * .1, aw, ah, ad);
    put(P.roofB, fw / 2 + aw / 2 - .01, ah, -fd * .1, aw + .04, .04, ad + .04); }
  else { P.wallB.set(h, ZERO); P.roofB.set(h, ZERO); }
}
function houseColors(h) {
  _c.set(WALL_HEX[Math.floor(hash2(h, 3) * WALL_HEX.length)]); P.wallA.color(h, _c); P.wallB.color(h, _c);
  _c.set(roofHex(h)); P.roofA.color(h, _c); P.roofB.color(h, _c);
}
const growBox = (b, x, y) => b ? (b.x0 = Math.min(b.x0, x), b.x1 = Math.max(b.x1, x), b.y0 = Math.min(b.y0, y), b.y1 = Math.max(b.y1, y), b) : { x0: x, y0: y, x1: x, y1: y };
function setHouse(h, s, animate) {
  const c = SLOT_CELL[s], pv = SLOT_PROV[s];
  HOUSE_SLOT[h] = s; HOUSE_CELL[h] = c; SLOT_TAKEN[s] = 1; CELL_HOUSE[c] = h;
  if (STATE[c] !== 4) STATE[c] = 3;
  const x = c % W, y = (c / W) | 0;
  bbox = growBox(bbox, x, y); PROV_BB[pv] = growBox(PROV_BB[pv], x, y); flatDirty.add(pv);
  houseColors(h);
  if (animate) { born.set(h, performance.now()); houseMatrices(h, 0); } else houseMatrices(h, 1);
  const dk = ((x / D) | 0) * 100000 + ((y / D) | 0), dd = districts.get(dk);
  if (dd) dd.n++; else districts.set(dk, { n: 1, x: ((x / D) | 0) * D + DC, y: ((y / D) | 0) * D + DC });
  const di = SLOT_DIST[s];
  if (di >= 0) { const d = CDIST[di]; if (!d.built) builtDistricts.push(d); d.built++; revealDistrict(d); return; }
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const n = ny * W + nx;
    if (STATE[n] === 1 && (nx % B === 0 || ny % B === 0)) { STATE[n] = 2; paintCell(n); addRoad(n); }
  }
}
function addHouse(pv, animate, owner) {
  if (houseCount >= HOUSE_SLOT.length) {
    const a = new Int32Array(HOUSE_SLOT.length * 2); a.set(HOUSE_SLOT); HOUSE_SLOT = a;
    const b = new Int32Array(HOUSE_CELL.length * 2); b.set(HOUSE_CELL); HOUSE_CELL = b;
  }
  const s = nextFreeSlot(pv); if (s < 0) return false;
  HOUSE_OWNER[houseCount] = owner;
  setHouse(houseCount, s, animate);
  PROV_COUNT[pv]++; houseCount++;
  return true;
}

// ---------- Izgara yollar ----------
function addRoad(c) {
  const x = c % W, y = (c / W) | 0, i = roadList.length;
  roadList.push(c); roadIdx.set(c, i);
  const hor = y % B === 0, ver = x % B === 0, inter = hor && ver;
  _p.set(x + .5, 0, y + .5);
  const sw = .74, aw = .56;
  _m.compose(_p, QI, _s.set(inter ? sw : hor ? 1 : sw, 1, inter ? sw : ver ? 1 : sw)); P.side.set(i, _m);
  _m.compose(_p, QI, _s.set(inter ? aw : hor ? 1 : aw, 1, inter ? aw : ver ? 1 : aw)); P.asph.set(i, _m);
  if (inter) P.dash.set(i, ZERO);
  else { _m.compose(_p, QI, _s.set(hor ? .34 : .032, 1, hor ? .032 : .34)); P.dash.set(i, _m); }
}
function hideRoad(c) { const i = roadIdx.get(c); if (i === undefined) return; P.side.set(i, ZERO); P.asph.set(i, ZERO); P.dash.set(i, ZERO); roadIdx.delete(c); }
const isRoad = (x, y) => x >= 0 && y >= 0 && x < W && y < H && STATE[y * W + x] === 2;

// ---------- Organik mahalle: kenar caddeleri + eğri yolların açılması ----------
function revealArterials(d, side) {
  for (let i = 0; i <= D; i++) {
    const [a, b] = [[i, D], [0, i], [D, i], [i, 0]][side], [wx, wz] = tf(d, a + .5, b + .5);
    const x = Math.floor(wx), z = Math.floor(wz); if (x < 0 || z < 0 || x >= W || z >= H) continue;
    const c = z * W + x; if (LAND[c] && STATE[c] === 1) { STATE[c] = 2; paintCell(c); addRoad(c); }
  }
}
function revealDistrict(d) {
  if (!d.art) { d.art = true; revealArterials(d, 0); }
  const ps = d.T.pieces;
  while (d.pp < ps.length && ps[d.pp].rc <= d.built + 1) addPiece(d, ps[d.pp++]);
}
function markCells(x0, z0, x1, z1, test) {
  for (let z = Math.floor(z0); z <= z1; z++) for (let x = Math.floor(x0); x <= x1; x++) {
    if (x < 0 || z < 0 || x >= W || z >= H) continue;
    const c = z * W + x; if (STATE[c] === 1 && test(x + .5, z + .5)) STATE[c] = 5;
  }
}
function addPiece(d, p) {
  if (p.k === 4) return revealArterials(d, p.side);
  const [x, z] = tf(d, p.x, p.z), rot = d.k * Math.PI / 2;
  _p.set(x, 0, z);
  if (p.k === 0) {
    _q.setFromAxisAngle(UP, p.a + rot);
    _m.compose(_p, _q, _s.set(.42, 1, .74)); P.cSide.set(nSeg, _m);
    _m.compose(_p, _q, _s.set(.38, 1, .56)); P.cAsph.set(nSeg, _m); nSeg++;
    markCells(x, z, x, z, () => true); d.segRev[p.road]++;
  } else if (p.k === 1) {
    _q.setFromAxisAngle(UP, p.a + rot); _m.compose(_p, _q, _s.set(.34, 1, .032)); P.cDash.set(nDash++, _m);
  } else if (p.k === 2) {
    _m.compose(_p, QI, _s.set(p.r + .14, 1, p.r + .14)); P.dSide.set(nDisc, _m);
    _m.compose(_p, QI, _s.set(p.r, 1, p.r)); P.dAsph.set(nDisc, _m); nDisc++;
    markCells(x - p.r, z - p.r, x + p.r, z + p.r, (cx, cz) => Math.hypot(cx - x, cz - z) < p.r);
  } else {
    _q.setFromAxisAngle(UP, rot); _m.compose(_p, _q, _s.set(p.rx, 1, p.rz)); P.parkD.set(nPark++, _m);
    const rx = d.k % 2 ? p.rz : p.rx, rz = d.k % 2 ? p.rx : p.rz;
    markCells(x - rx, z - rz, x + rx, z + rz, (cx, cz) => ((cx - x) / rx) ** 2 + ((cz - z) / rz) ** 2 < 1);
  }
}

// ---------- Ağaçlar + parklar (sadece evi olan illerin çevresinde) ----------
function rebuildTrees() {
  processFlatten(true);
  P.trunk.clear(); P.leaf.clear();
  stampId = (stampId % 254) + 1;
  let n = 0;
  const plant = (x, z, sc, seed) => {
    if (n >= 30000) return;
    _p.set(x, heightAt(x, z), z); _m.compose(_p, QI, _s.set(sc, sc, sc));
    P.trunk.set(n, _m); P.leaf.set(n, _m); _c.set(TREE_HEX[Math.floor(hash2(seed, 7) * 4)]); P.leaf.color(n, _c); n++;
  };
  const tree = (x, y, s) => plant(x + .5 + (hash2(x * 5, y * 3) - .5) * .5, y + .5 + (hash2(y * 5, x * 3) - .5) * .5, s * (.75 + hash2(x, y * 11) * .6), x * 31 + y);
  const nb = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let pv = 0; pv < NP; pv++) {
    const bb = PROV_BB[pv]; if (!bb) continue;
    const M = 30, x0 = Math.max(0, bb.x0 - M), y0 = Math.max(0, bb.y0 - M), x1 = Math.min(W - 1, bb.x1 + M), y1 = Math.min(H - 1, bb.y1 + M);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = y * W + x; if (STATE[c] !== 1 || STAMP[c] === stampId) continue; STAMP[c] = stampId;
      const di = DGRID[((y / D) | 0) * DW + ((x / D) | 0)];
      if (di >= 0 && CDIST[di].built) continue;
      const bxx = (x / B) | 0, byy = (y / B) | 0;
      if (PARK[byy * BW + bxx]) {
        if (nb.some(([dx, dy]) => STATE[((byy + dy) * B + 2) * W + (bxx + dx) * B + 1] === 3)) { paintCell(c, PARK_RGB); if (hash2(x * 7, y * 13) < .3) tree(x, y, 1.1); continue; }
      }
      const lx = x % B, ly = y % B;
      if (lx >= 2 && lx <= 3 && ly >= 2 && ly <= 3 && STATE[(byy * B + 1) * W + bxx * B + 1] === 3) { if (hash2(x * 3, y * 5) < .35) tree(x, y, .9); continue; }
    }
  }
  for (const d of builtDistricts) if (d.built >= d.T.parkRC) d.T.trees.forEach((t, i) => { const [x, z] = tf(d, t[0], t[1]); plant(x, z, t[2], d.id * 17 + i); });
  flushImage(true);
}

// ---------- Ormanlar: kameranın etrafında, bölgeye göre yoğunluk ----------
let forestKey = '';
function updateForest() {
  if (rig.dist > 460) { if (forestKey) { P.fTrunk.clear(); P.fPine.clear(); P.fRound.clear(); forestKey = ''; } return; }
  const half = clamp(rig.dist * 1.7, 50, 400), stride = Math.max(1, Math.floor(half / 140)), cell = half * .35;
  const key = `${Math.round(rig.tx / cell)},${Math.round(rig.tz / cell)},${stride}`;
  if (key === forestKey) return; forestKey = key;
  P.fTrunk.clear(); P.fPine.clear(); P.fRound.clear();
  let n = 0, np = 0, nr = 0;
  const x0 = Math.max(0, Math.floor((rig.tx - half) / stride) * stride), x1 = Math.min(W - 1, rig.tx + half);
  const z0 = Math.max(0, Math.floor((rig.tz - half) / stride) * stride), z1 = Math.min(H - 1, rig.tz + half);
  for (let z = z0; z <= z1 && n < 70000; z += stride) for (let x = x0; x <= x1; x += stride) {
    const c = z * W + x, k = KIND[c]; if (!((k === 1 && STATE[c] === 1) || k === 2)) continue;
    const gi = Math.min(GH - 1, Math.round(z / G)) * GW + Math.min(GW - 1, Math.round(x / G));
    if (FG[gi] < .6 || hash2(x * 3 + 1, z * 7 + 2) > DENS[gi]) continue;
    const px = x + .5 + (hash2(x, z * 3) - .5) * stride * .8, pz = z + .5 + (hash2(z, x * 5) - .5) * stride * .8;
    const sc = (.8 + hash2(x * 11, z) * .6) * Math.pow(stride, .55);
    _p.set(px, heightAt(px, pz), pz); _m.compose(_p, QI, _s.set(sc, sc, sc)); P.fTrunk.set(n++, _m);
    _c.set(TREE_HEX[Math.floor(hash2(x, z * 7) * 4)]);
    if (hash2(x * 5, z * 9) < ROUNDF[gi]) { P.fRound.set(nr, _m); P.fRound.color(nr++, _c); } else { P.fPine.set(np, _m); P.fPine.color(np++, _c); }
  }
}

// ---------- Arabalar ----------
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function pickRoadNear(tx, tz, R) {
  if (!roadList.length) return -1;
  for (let t = 0; t < 200; t++) {
    const c = roadList[Math.floor(Math.random() * roadList.length)];
    if (STATE[c] === 2 && Math.hypot(c % W - tx, ((c / W) | 0) - tz) < R) return c;
  }
  return -1;
}
function spawnPathCar(car) {
  const R = Math.max(30, rig.dist * 1.3);
  for (let t = 0; t < 30; t++) {
    const d = builtDistricts[Math.floor(Math.random() * builtDistricts.length)];
    if (Math.hypot(d.ox + DC - rig.tx, d.oz + DC - rig.tz) > R + 15) continue;
    const okr = []; d.T.roads.forEach((r, i) => { if (r.render && d.segRev[i] >= d.T.segCount[i]) okr.push(i); });
    if (!okr.length) continue;
    const ri = okr[Math.floor(Math.random() * okr.length)];
    Object.assign(car, { m: 1, d, ri, s: Math.random() * d.T.roads[ri].L, dir: Math.random() < .5 ? 1 : -1, sp: 1 + Math.random() * 1.2, hide: false });
    return true;
  }
  return false;
}
function spawnCar(car) {
  if (builtDistricts.length && Math.random() < .5 && spawnPathCar(car)) return true;
  const c = pickRoadNear(rig.tx, rig.tz, Math.max(25, rig.dist * 1.2));
  if (c < 0) { if (builtDistricts.length && spawnPathCar(car)) return true; car.hide = true; return true; }
  const x = c % W, y = (c / W) | 0, hor = y % B === 0;
  Object.assign(car, { m: 0, x, y, d: hor ? (Math.random() < .5 ? 0 : 2) : (Math.random() < .5 ? 1 : 3), p: Math.random(), sp: 1.2 + Math.random() * 1.4, hide: false });
  return true;
}
function stepCar(car) {
  const [dx, dy] = DIRS[car.d], nx = car.x + dx, ny = car.y + dy;
  if (!isRoad(nx, ny)) { car.d = (car.d + 2) % 4; return; }
  car.x = nx; car.y = ny;
  if (nx % B === 0 && ny % B === 0) {
    const opts = [0, 1, 2, 3].filter(d => d !== (car.d + 2) % 4 && isRoad(nx + DIRS[d][0], ny + DIRS[d][1]));
    if (opts.length) car.d = opts[Math.floor(Math.random() * opts.length)];
  }
}
let carCheck = 0;
function updateCars(dt, now) {
  const want = rig.dist > 400 ? 0 : Math.min(300, Math.max(roadList.length ? 4 : 0, Math.floor(houseCount / 5)));
  while (cars.length < want) { const car = { col: CAR_HEX[cars.length % CAR_HEX.length] }; spawnCar(car); cars.push(car); }
  if (cars.length > want) cars.length = want;
  if (now - carCheck > 1200) { carCheck = now;
    for (const car of cars) {
      const far = car.hide ? 1e9 : car.m ? Math.hypot(car.d.ox + DC - rig.tx, car.d.oz + DC - rig.tz) : Math.hypot(car.x - rig.tx, car.y - rig.tz);
      if ((!car.hide && !car.m && STATE[car.y * W + car.x] !== 2) || far > Math.max(40, rig.dist * 2)) spawnCar(car);
    } }
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (car.hide) { P.carB.set(i, ZERO); P.carC.set(i, ZERO); continue; }
    if (car.m) {
      const r = car.d.T.roads[car.ri];
      car.s += car.dir * car.sp * dt;
      if (r.kind === 'ring') car.s = (car.s + r.L) % r.L;
      else if (car.s > r.L) { car.s = r.L; car.dir = -1; } else if (car.s < 0) { car.s = 0; car.dir = 1; }
      const [lx, lz, tx, tz] = sampleRoad(r, car.s), fx = tx * car.dir, fz = tz * car.dir;
      const [wx, wz] = tf(car.d, lx - fz * .19, lz + fx * .19);
      _p.set(wx, 0, wz); _q.setFromAxisAngle(UP, Math.atan2(-fz, fx) + car.d.k * Math.PI / 2);
    } else {
      car.p += car.sp * dt;
      while (car.p >= 1) { car.p -= 1; stepCar(car); }
      const [dx, dy] = DIRS[car.d];
      _p.set(car.x + .5 + dx * (car.p - .5) - dy * .19, 0, car.y + .5 + dy * (car.p - .5) + dx * .19);
      _q.setFromAxisAngle(UP, [0, -Math.PI/2, Math.PI, Math.PI/2][car.d]);
    }
    _m.compose(_p, _q, _s.set(1, 1, 1));
    P.carB.set(i, _m); P.carC.set(i, _m); _c.set(car.col); P.carB.color(i, _c);
  }
  P.carB.mesh.count = P.carC.mesh.count = cars.length;
}

// ==========================================================
//  VERİ
//  log: { t:'people', list:[[kullanıcı, ilNo], ...] }  ← yorumlardan gelen evler
//       { t:'grow', n }                                  ← eski yöntem (takipçi sayısı)
//       { t:'build', ... }                               ← yapılar
// ==========================================================
let DATA = null;
let OWNER_INDEX = [];
const defaultData = () => ({ v: 2, world: WORLD_VERSION, handle: '', town: '', seed: 'İstanbul', log: [], owners: {} });
const townName = () => (DATA.town || 'takipçi şehri').toLocaleLowerCase('tr-TR');
const seedProv = () => provIndex(DATA.seed);

function dayCount() { return DATA.log.filter(e => e.t === 'grow' || e.t === 'people').length; }
function save() { if (!IS_ADMIN) return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); } catch (e) { toast('Kaydedilemedi: ' + e.message); } }
function provsWithHouses() { let n = 0; for (let p = 0; p < NP; p++) if (PROV_COUNT[p]) n++; return n; }

function applyEntry(e, animate) {
  if (e.t === 'grow') { const pv = seedProv(), target = Math.min(e.n, NS); while (houseCount < target && addHouse(pv, animate)); }
  else if (e.t === 'people') { for (const [name, p] of e.list) addHouse(p < 0 ? seedProv() : p, animate, name); }
  else if (e.t === 'build') placeBuilding(e);
}
function replay() {
  resetWorld();
  for (const e of DATA.log) applyEntry(e, false);
  if (!houseCount) { const pv = seedProv(), s = PROV_START[pv]; if (SLOT_DIST[s] >= 0) revealArterials(CDIST[SLOT_DIST[s]], 0); }
  processFlatten(true); rebuildTrees(); flushImage(true); rebuildOwnerIndex(); updateStats();
}
function rebuildOwnerIndex() {
  OWNER_INDEX = [];
  for (let h = 0; h < houseCount; h++) { const o = ownerOf(h); if (o) OWNER_INDEX.push([String(o).toLowerCase(), h + 1, String(o)]); }
}
async function loadData() {
  let ls = null, remote = null;
  try { ls = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch {}
  try { const r = await fetch('data.json', { cache: 'no-store' }); if (r.ok) remote = await r.json(); } catch {}
  const d = IS_ADMIN ? (ls || remote) : (remote || ls);
  return Object.assign(defaultData(), d || {});
}

// ==========================================================
//  YORUMLARI GETİR → kişi listesi
// ==========================================================
let PENDING = null;   // { list:[[kullanıcı, il]], stats }
function buildPeople(comments) {
  const have = new Set(OWNER_INDEX.map(e => e[0])), seen = new Set(), list = [], byProv = new Int32Array(NP);
  let noProv = 0, dup = 0, total = 0;
  const allowNoProv = IS_ADMIN && $('aNoProv')?.checked;
  comments.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  for (const c of comments) {
    const u = String(c.username || '').replace(/^@/, '').trim(); if (!u) continue; total++;
    const key = u.toLowerCase(); if (seen.has(key) || have.has(key)) { dup++; continue; }
    const p = detectProvince(c.text || '');
    if (p < 0 && !allowNoProv) { noProv++; continue; }
    seen.add(key); list.push([u, p]); if (p >= 0) byProv[p]++; else noProv++;
  }
  const top = [...byProv].map((n, p) => [p, n]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  return { list, stats: { total, dup, noProv, provs: top.length, top } };
}
function parseCommentFile(text, name) {
  text = text.replace(/^﻿/, '');
  if (/\.json$/i.test(name) || /^\s*[\[{]/.test(text)) {
    const j = JSON.parse(text), arr = Array.isArray(j) ? j : j.data || j.comments || [];
    return arr.map(c => ({ username: c.username || c.user?.username || c.owner?.username || c.author || c.from?.username, text: c.text || c.comment || c.message || '', timestamp: c.timestamp || c.created_at || '' }));
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const head = lines[0].toLowerCase().split(sep).map(s => s.replace(/"/g, '').trim());
  let ui = head.findIndex(h => /user|kullan|owner|author|profil/.test(h)), ti = head.findIndex(h => /text|comment|yorum|message|mesaj/.test(h));
  const hasHead = ui >= 0 || ti >= 0; if (ui < 0) ui = 0; if (ti < 0) ti = ui === 0 ? 1 : 0;
  return lines.slice(hasHead ? 1 : 0).map(l => {
    const cols = l.match(new RegExp(`("([^"]|"")*"|[^${sep}]*)(${sep}|$)`, 'g')).map(s => s.replace(new RegExp(`${sep}$`), '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (cols.length < 2) { const m = l.match(/^@?([A-Za-z0-9._]+)[:\s-]+(.*)$/); return m ? { username: m[1], text: m[2] } : {}; }
    return { username: cols[ui], text: cols.slice(ti).join(' ') };
  });
}
function demoComments(n) {
  const names = ['ahmet','mehmet','ayse','fatma','emre','zeynep','burak','elif','can','deniz','mert','selin','oguz','ece','kaan','irem','berk','melis','umut','seda','yusuf','esra','hakan','merve','onur','buse'];
  const tpl = ['{il}\'den selamlar 👋', '{il}!!', 'ben {il}', '{plaka} 🔥🔥', '{il}liyim evimi istiyorum', '{il} burada', 'evim {il} olsun lütfen', '{il} represent'];
  const totalPop = PROVINCES.reduce((a, p) => a + p.pop, 0), out = [];
  for (let i = 0; i < n; i++) {
    const u = names[Math.floor(Math.random() * names.length)] + ['', '.', '_'][i % 3] + (Math.random() < .5 ? names[Math.floor(Math.random() * names.length)] : '') + Math.floor(Math.random() * 999);
    let r = Math.random() * totalPop, p = 0; while (r > PROVINCES[p].pop) { r -= PROVINCES[p].pop; p++; }
    const text = Math.random() < .1 ? ['harika olmuş 😂', 'devamı gelsin', 'bu ne ya 🔥'][i % 3]
      : tpl[Math.floor(Math.random() * tpl.length)].replace('{il}', PROVINCES[p].name).replace('{plaka}', String(p + 1).padStart(2, '0'));
    out.push({ username: u, text, timestamp: String(i).padStart(7, '0') });
  }
  return out;
}
// Instagram Graph API (resmi yol). Anahtar: Instagram profesyonel hesap + Meta geliştirici uygulaması.
const IG = 'https://graph.instagram.com/v21.0';
async function igGet(url) { const r = await fetch(url); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; }
async function igAll(url, onProg) { const out = []; while (url) { const j = await igGet(url); out.push(...(j.data || [])); onProg?.(out.length); url = j.paging?.next; } return out; }

// ==========================================================
//  YAPILAR — yeni yapı eklemek için buraya bir giriş yaz.
// ==========================================================
function box(g, w, h, d, x, y, z, color, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || matLambert({ color }));
  m.position.set(x, y + h / 2, z); m.castShadow = o.cast !== false; m.receiveShadow = true; g.add(m); return m;
}
function cyl(g, rt, rb, h, x, y, z, color, seg = 12, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat || matLambert({ color }));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function textTex(text, w = 512, h = 160, bg = '#ffffff', fg = '#1d2433') {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    let fs = h * .55; g.font = `900 ${fs}px Nunito, sans-serif`;
    const m = g.measureText(text).width; if (m > w * .9) fs *= w * .9 / m;
    g.font = `900 ${fs}px Nunito, sans-serif`; g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + fs * .05);
  });
}
function addTree(g, x, z, s = 1) {
  cyl(g, .035 * s, .05 * s, .26 * s, x, 0, z, '#6b5138', 5);
  const l = new THREE.Mesh(new THREE.ConeGeometry(.2 * s, .5 * s, 6), matLambert({ color: TREE_HEX[Math.floor(Math.random() * 4)], flatShading: true }));
  l.position.set(x, .45 * s, z); l.castShadow = true; g.add(l);
}
let gltfLoader = null;
async function loadGLB(url) {
  if (!gltfLoader) { const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); gltfLoader = new GLTFLoader(); }
  return new Promise((res, rej) => gltfLoader.load(url, g => res(g.scene), undefined, rej));
}
const BUILDINGS = {
  stadium: {
    name: '⚽ Futbol Stadı', w: 12, h: 8, ask: 'Stadın adı', def: 'Takipçi Arena',
    build(b) {
      const g = new THREE.Group(), w = 12, h = 8, seat = b.color || '#c8433a';
      box(g, w, .08, h, w/2, 0, h/2, '#a7adb4', { cast: false });
      const ft = canvasTex(360, 220, (c, W_, H_) => {
        for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#4f9a3a' : '#5aa844'; c.fillRect(i * W_/10, 0, W_/10 + 1, H_); }
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(8, 8, W_-16, H_-16);
        c.beginPath(); c.moveTo(W_/2, 8); c.lineTo(W_/2, H_-8); c.stroke();
        c.beginPath(); c.arc(W_/2, H_/2, 30, 0, 7); c.stroke();
        c.strokeRect(8, H_*.28, 50, H_*.44); c.strokeRect(W_-58, H_*.28, 50, H_*.44);
      });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w - 3.2, h - 3.2), matLambert({ map: ft }));
      f.rotation.x = -Math.PI / 2; f.position.set(w/2, .09, h/2); f.receiveShadow = true; g.add(f);
      const st = '#d5d9de';
      box(g, w, 1.0, 1.4, w/2, 0, .7, st); box(g, w, 1.0, 1.4, w/2, 0, h - .7, st);
      box(g, 1.4, 1.0, h - 2.8, .7, 0, h/2, st); box(g, 1.4, 1.0, h - 2.8, w - .7, 0, h/2, st);
      box(g, w - .6, .06, .9, w/2, 1.0, .8, seat); box(g, w - .6, .06, .9, w/2, 1.0, h - .8, seat);
      box(g, .9, .06, h - 3, .8, 1.0, h/2, seat); box(g, .9, .06, h - 3, w - .8, 1.0, h/2, seat);
      for (const [x, z] of [[.4, .4], [w - .4, .4], [.4, h - .4], [w - .4, h - .4]]) {
        cyl(g, .06, .08, 3.2, x, 0, z, '#8a9097', 6); box(g, .6, .3, .2, x, 3.2, z, '#f4f4f4'); }
      return g;
    }
  },
  skyscraper: {
    name: '🏙️ Gökdelen', w: 3, h: 3, ask: 'Gökdelenin adı', def: 'Takipçi Plaza',
    build(b) {
      const g = new THREE.Group(), base = b.color || '#3a4a62';
      const t = canvasTex(64, 64, (c) => { c.fillStyle = base; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(210,230,250,.75)';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c.fillRect(4 + i * 15, 4 + j * 15, 11, 10); }, [3, 12]);
      box(g, 2.5, 9, 2.5, 1.5, 0, 1.5, null, { mat: matLambert({ map: t }) });
      box(g, 2.7, .25, 2.7, 1.5, 9, 1.5, '#e4e6e8'); box(g, 1.4, .8, 1.4, 1.5, 9.25, 1.5, '#cfd3d7');
      cyl(g, .04, .06, 2, 1.5, 10, 1.5, '#9aa0a6', 6);
      return g;
    }
  },
  billboard: {
    name: '🪧 Billboard', w: 6, h: 2, ask: 'Billboard yazısı (marka)', def: 'REKLAM ALANI',
    build(b) {
      const g = new THREE.Group();
      cyl(g, .08, .08, 2.4, 1.6, 0, 1, '#5b6067', 8); cyl(g, .08, .08, 2.4, 4.4, 0, 1, '#5b6067', 8);
      const tm = matLambert({ map: textTex(b.label || this.def) }), fr = matLambert({ color: b.color || '#f2a93b' });
      const m = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.7, .14), [fr, fr, fr, fr, tm, tm]);
      m.position.set(3, 3.2, 1); m.castShadow = true; g.add(m);
      return g;
    }
  },
  park: {
    name: '🌳 Park', w: 6, h: 6, ask: 'Parkın adı', def: 'Takipçi Parkı',
    build(b) {
      const g = new THREE.Group();
      box(g, 6, .03, 6, 3, 0, 3, '#97c45a', { cast: false });
      box(g, .5, .035, 6, 3, 0, 3, '#e6dcc0', { cast: false }); box(g, 6, .035, .5, 3, 0, 3, '#e6dcc0', { cast: false });
      cyl(g, 1, 1, .05, 4.5, 0, 4.5, '#6fb7dd', 20);
      for (let i = 0; i < 12; i++) { const x = hash2(i, b.x) * 2.3 + (i % 2 ? 3.4 : .3), z = hash2(b.y, i) * 2.3 + (i % 3 ? .3 : 3.4); addTree(g, x, z, 1.3); }
      return g;
    }
  },
  tower: {
    name: '🗼 Takipçi Kulesi', w: 3, h: 3, ask: 'Kulenin adı', def: 'Takipçi Kulesi',
    build(b) {
      const g = new THREE.Group(), col = b.color || '#c8433a';
      const t = canvasTex(32, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : col; c.fillRect(0, i * 8, 32, 8); } });
      cyl(g, .45, .9, 9, 1.5, 0, 1.5, null, 16, matLambert({ map: t }));
      cyl(g, 1.2, 1.2, .5, 1.5, 9, 1.5, '#e9ecef', 20); cyl(g, .9, .9, .5, 1.5, 9.5, 1.5, '#8fb8d8', 20);
      cyl(g, .03, .06, 2.2, 1.5, 10, 1.5, '#9aa0a6', 6);
      return g;
    }
  },
  model: {
    name: '📦 3D Model (.glb)', w: 4, h: 4, ask: 'Yapının adı (etikette yazar)', def: 'Truva Atı', model: true,
    build(b) {
      const g = new THREE.Group(), w = bw(b), h = bh(b);
      const ph = box(g, w * .8, 1, h * .8, w / 2, 0, h / 2, '#d9dcdf');
      loadGLB('models/' + b.file).then(obj => {
        const bb = new THREE.Box3().setFromObject(obj), size = bb.getSize(new THREE.Vector3());
        const sc = (b.scale || 1) * Math.min(w / size.x, h / size.z) * .95; obj.scale.setScalar(sc);
        const bb2 = new THREE.Box3().setFromObject(obj), c = bb2.getCenter(new THREE.Vector3());
        obj.position.set(w / 2 - c.x, -bb2.min.y, h / 2 - c.z);
        obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        g.remove(ph); g.add(obj);
      }).catch(() => toast(`models/${b.file} bulunamadı`));
      return g;
    }
  },
};
const bw = b => b.w || BUILDINGS[b.type].w, bh = b => b.h || BUILDINGS[b.type].h;
function canPlace(b) {
  for (let y = b.y; y < b.y + bh(b); y++) for (let x = b.x; x < b.x + bw(b); x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const c = y * W + x; if (STATE[c] === 4 || STATE[c] === 5 || !LAND[c]) return false;
  }
  return true;
}
function placeBuilding(b) {
  const def = BUILDINGS[b.type]; if (!def) return;
  const x0 = b.x, y0 = b.y, x1 = b.x + bw(b), y1 = b.y + bh(b);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const c = y * W + x; if (!LAND[c]) continue;
    if (STATE[c] === 2) hideRoad(c);
    STATE[c] = 4; CELL_HOUSE[c] = -1; paintCell(c, [150, 156, 150]);
  }
  for (let h = 0; h < houseCount; h++) {
    const c = HOUSE_CELL[h], x = c % W, y = (c / W) | 0;
    if (x >= x0 && x < x1 && y >= y0 && y < y1) { const s = nextFreeSlot(houseProv(h)); if (s >= 0) setHouse(h, s, false); }
  }
  const g = def.build.call(def, b); g.position.set(b.x, 0, b.y); scene.add(g); bGroups.set(b.id, g);
  buildings.push(b);
}

// ==========================================================
//  ETKİNLİKLER
// ==========================================================
const effects = [];
const EVENTS = {
  ufo:       { name: '🛸 UFO İstilası', run() { effects.push(makeUFO()); } },
  fireworks: { name: '🎆 Havai Fişek',  run() { effects.push(makeFireworks(4500)); } },
};
function makeUFO() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: .6, roughness: .35 });
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12), metal); s1.scale.set(1, .22, 1); g.add(s1);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#9fe8ff', transparent: true, opacity: .75, roughness: .1 }));
  dome.position.y = .12; g.add(dome);
  const lights = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
    l.position.set(Math.cos(a) * .82, -.04, Math.sin(a) * .82); g.add(l); lights.push(l); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true).translate(0, -.5, 0),
    new THREE.MeshBasicMaterial({ color: '#b8ff7a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  g.add(beam); scene.add(g);
  const tx = rig.tx, tz = rig.tz, s = clamp(rig.dist * .05, 1.2, 50), hy = 5 * s, t0 = performance.now();
  const T1 = 1800, T2 = 4500, T3 = 1500; let lastBeep = 0;
  g.scale.setScalar(s);
  return {
    update(now) {
      const t = now - t0; let x, y, z, bo = 0;
      if (t < T1) { const e = easeInOut(t / T1); x = lerp(tx - 30 * s, tx, e); y = lerp(hy * 3, hy, e); z = lerp(tz - 25 * s, tz, e); }
      else if (t < T1 + T2) { const k = (t - T1) / T2; x = tx + Math.sin(k * 10) * .3 * s; y = hy + Math.sin(k * 18) * .15 * s; z = tz; bo = Math.min(1, k * 5, (1 - k) * 5);
        if (now - lastBeep > 280) { lastBeep = now; beep(200 + Math.random() * 90, .09); } }
      else { const e = easeInOut(Math.min(1, (t - T1 - T2) / T3)); x = lerp(tx, tx + 40 * s, e); y = lerp(hy, hy * 4, e); z = lerp(tz, tz + 10 * s, e); }
      g.position.set(x, y, z); g.rotation.y = t / 400;
      beam.material.opacity = .38 * bo; beam.scale.set(1.3, y / s, 1.3);
      lights.forEach((l, i) => l.material.color.set((Math.floor(t / 150) + i) % 2 ? '#ffd23f' : '#ff3d5a'));
      if (t > T1 + T2 + T3) { scene.remove(g); return false; }
      return true;
    }
  };
}
const fx = $('fx'), fctx = fx.getContext('2d');
const fxParts = [];
function makeFireworks(dur) {
  const t0 = performance.now(); let nextBurst = 0;
  const cols = ['#ffd23f','#ff3d5a','#4fc3f7','#7cff6b','#ff9ff3','#fff'];
  return {
    update(now) {
      if (now - t0 < dur && now > nextBurst) {
        nextBurst = now + 220 + Math.random() * 300;
        const cx = vw * (.15 + Math.random() * .7), cy = vh * (.2 + Math.random() * .35), col = cols[Math.floor(Math.random() * cols.length)];
        for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
          fxParts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col }); }
        beep(700 + Math.random() * 500, .05);
      }
      return now - t0 < dur;
    }
  };
}
function drawFx() {
  const d = Math.min(devicePixelRatio || 1, 2);
  fctx.setTransform(d, 0, 0, d, 0, 0);
  fctx.clearRect(0, 0, vw, vh);
  for (const p of fxParts) { p.x += p.vx; p.y += p.vy; p.vy += .06; p.vx *= .985; p.life -= .013;
    fctx.globalAlpha = Math.max(0, p.life); fctx.fillStyle = p.col; fctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  fctx.globalAlpha = 1;
  for (let i = fxParts.length - 1; i >= 0; i--) if (fxParts[i].life <= 0) fxParts.splice(i, 1);
}

// ==========================================================
//  KAMERA
// ==========================================================
const rig = { tx: W / 2, tz: H / 2, dist: 2000, pitch: 1.55, yaw: 0, orbit: 0 };
const FOV = 45, TOP = 89.4 * Math.PI / 180;
const pitchFor = d => (38 + clamp((Math.log(d) - Math.log(10)) / (Math.log(600) - Math.log(10)), 0, 1) * 51.5) * Math.PI / 180;
const TRB = (() => { const xs = TR_OUTLINE.map(p => p[0]), zs = TR_OUTLINE.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) }; })();
const fitTurkeyDist = () => Math.max((TRB.z1 - TRB.z0) / 2, (TRB.x1 - TRB.x0) / 2 / (vw / vh)) * 1.06 / Math.tan(FOV / 2 * Math.PI / 180);
function applyCam() {
  const hd = rig.dist * Math.cos(rig.pitch), y = rig.dist * Math.sin(rig.pitch);
  camera.position.set(rig.tx + Math.sin(rig.yaw) * hd, y, rig.tz + Math.cos(rig.yaw) * hd);
  camera.lookAt(rig.tx, 0, rig.tz);
  camera.near = Math.max(.05, rig.dist * .01); camera.far = rig.dist * 14 + 800;
  camera.updateProjectionMatrix();
  scene.fog.near = rig.dist * 1.3; scene.fog.far = rig.dist * 3.6 + 45;
  const s = clamp(rig.dist * .75, 8, 110);
  sun.position.set(rig.tx + SUN_DIR.x * s * 2, SUN_DIR.y * s * 2, rig.tz + SUN_DIR.z * s * 2);
  sun.target.position.set(rig.tx, 0, rig.tz);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -s; sc.right = sc.top = s; sc.near = .5; sc.far = s * 5; sc.updateProjectionMatrix();
}
function clampRig() {
  rig.dist = clamp(rig.dist, 2.5, fitTurkeyDist() * 1.5);
  rig.tx = clamp(rig.tx, 0, W); rig.tz = clamp(rig.tz, 0, H);
}
let flyTok = 0;
function flyTo(to, dur = 1200) {
  const tok = ++flyTok, f = { ...rig };
  const t = { tx: to.tx ?? f.tx, tz: to.tz ?? f.tz, dist: to.dist ?? f.dist, pitch: to.pitch ?? pitchFor(to.dist ?? f.dist), yaw: to.yaw ?? f.yaw };
  const l0 = Math.log(f.dist), l1 = Math.log(t.dist);
  return anim(dur, k => {
    if (tok !== flyTok) return;
    const e = easeInOut(k); rig.dist = Math.exp(lerp(l0, l1, e));
    const u = Math.abs(l1 - l0) < .05 ? e : (1 / rig.dist - 1 / f.dist) / (1 / t.dist - 1 / f.dist);
    rig.tx = lerp(f.tx, t.tx, u); rig.tz = lerp(f.tz, t.tz, u);
    rig.pitch = lerp(f.pitch, t.pitch, e); rig.yaw = lerp(f.yaw, t.yaw, e);
  });
}
function fitBox(b, aspect = vw / vh) {
  const bw_ = b.x1 - b.x0 + 4, bh_ = b.y1 - b.y0 + 4;
  const dist = clamp(Math.max(bw_ / aspect, bh_ * .8) * .5 / Math.tan(FOV / 2 * Math.PI / 180) * .92, 12, fitTurkeyDist());
  return { tx: (b.x0 + b.x1 + 1) / 2, tz: (b.y0 + b.y1 + 1) / 2, dist };
}
const turkeyView = () => ({ tx: (TRB.x0 + TRB.x1) / 2, tz: (TRB.z0 + TRB.z1) / 2, dist: fitTurkeyDist(), pitch: TOP, yaw: 0 });
function resize() {
  const r = stage.getBoundingClientRect(); vw = r.width || innerWidth || 1024; vh = r.height || innerHeight || 768;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr); renderer.setSize(vw, vh, false);
  fx.width = Math.round(vw * dpr); fx.height = Math.round(vh * dpr);
  camera.aspect = vw / vh;
}

const pin = new THREE.Group();
{ const red = new THREE.MeshLambertMaterial({ color: '#ff3d5a' });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.22, .55, 16), red); cone.rotation.x = Math.PI; cone.position.y = .28; pin.add(cone);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 12), red); ball.position.y = .62; pin.add(ball);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff' })); dot.position.set(0, .64, .17); pin.add(dot); }
const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .68, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff3d5a', transparent: true, depthWrite: false }));
pin.visible = ring.visible = false; scene.add(pin, ring);
const ghost = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: '#27ae60', transparent: true, opacity: .45, depthWrite: false }));
ghost.visible = false; scene.add(ghost);

let selected = -1, placing = null, hover = null;

// ==========================================================
//  ETİKETLER
// ==========================================================
const labelsEl = $('labels'), labelPool = [];
const MAH = ['Lale','Gül','Çınar','Papatya','Yıldız','Güneş','Deniz','Bahar','Pınar','Kartal','Zeytin','İnci',
  'Menekşe','Sümbül','Akasya','Ihlamur','Martı','Nergis','Defne','Ayva','Fıstık','Kiraz','Leylek','Selvi'];
const mahName = (dx, dy) => MAH[Math.floor(hash2(dx, dy) * MAH.length)] + ' Mahallesi';
const bLabel = b => BUILDINGS[b.type].model ? (b.label || b.file) : (b.label || BUILDINGS[b.type].def);
function updateLabels() {
  const items = [], d = rig.dist, tdist = fitTurkeyDist();
  if (d > 140) {
    if (houseCount) {      // il balonları: ad + ev sayısı
      for (const p of PROVINCES) if (PROV_COUNT[p.i]) items.push([p.name, p.x, 0, p.y, 'prov', fmt(PROV_COUNT[p.i])]);
    } else for (const p of PROVINCES) if (p.big || d < tdist * .55) items.push([p.name, p.x, 0, p.y, 'city']);
  }
  if (d > 22 && d < 140 && !video) {
    const ds = [...districts.values()].filter(v => v.n >= 10)
      .map(v => [v, (v.x - rig.tx) ** 2 + (v.y - rig.tz) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 12);
    for (const [v] of ds) items.push([mahName((v.x / D) | 0, (v.y / D) | 0), v.x, 1.5, v.y, 'mah']);
  }
  if (d < 28) {   // en yakın evlerin sahipleri
    const R2 = (d * .8) ** 2, near = [];
    for (const [, num, name] of OWNER_INDEX) {
      if (num - 1 === selected) continue;
      const [x, y] = housePos(num - 1), dd = (x - rig.tx) ** 2 + (y - rig.tz) ** 2;
      if (dd < R2) near.push([dd, name, x, y]);
    }
    near.sort((a, b) => a[0] - b[0]).slice(0, 14).forEach(([, name, x, y]) => items.push(['@' + name, x, 1.05, y, 'own']));
  }
  if (d < 300) for (const b of buildings) items.push([bLabel(b), b.x + bw(b) / 2, b.type === 'skyscraper' || b.type === 'tower' ? 11.5 : 4.2, b.y + bh(b) / 2, 'bld']);
  if (selected >= 0 && selected < houseCount && !video) { const [x, z] = housePos(selected); items.push([houseName(selected), x, 1.75 * clamp(rig.dist * .045, .9, 30), z, 'sel']); }

  let used = 0; const placed = [];
  items.sort((a, b) => (b[4] === 'prov') - (a[4] === 'prov') || (b[4] === 'prov' ? PROV_COUNT[provIndex(b[0])] - PROV_COUNT[provIndex(a[0])] : 0));
  for (const [text, x, y, z, cls, extra] of items) {
    _v.set(x, y, z).project(camera);
    if (_v.z > 1 || _v.x < -1.2 || _v.x > 1.2 || _v.y < -1.2 || _v.y > 1.2) continue;
    if (cls === 'prov' || cls === 'city') {   // üst üste binen il etiketlerini atla
      const sx = (_v.x + 1) / 2 * vw, sy = (1 - _v.y) / 2 * vh, w = text.length * 7 + (extra ? extra.length * 7 + 26 : 12), h = 22;
      if (placed.some(r => Math.abs(r[0] - sx) < (r[2] + w) / 2 && Math.abs(r[1] - sy) < h)) continue;
      placed.push([sx, sy, w]);
    }
    let el = labelPool[used];
    if (!el) { el = document.createElement('div'); labelsEl.appendChild(el); labelPool.push(el); }
    const key = text + '|' + (extra || '');
    if (el._t !== key) { if (extra) el.innerHTML = `${esc(text)}<b>${extra}</b>`; else el.textContent = text; el._t = key; }
    if (el._c !== cls) { el.className = 'lbl ' + cls; el._c = cls; }
    el.style.display = '';
    el.style.transform = `translate(${((_v.x + 1) / 2 * vw).toFixed(1)}px,${((1 - _v.y) / 2 * vh).toFixed(1)}px) translate(-50%,-100%)`;
    used++;
  }
  for (let i = used; i < labelPool.length; i++) if (labelPool[i].style.display !== 'none') labelPool[i].style.display = 'none';
}

// ==========================================================
//  ANA DÖNGÜ
// ==========================================================
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (const [h, t0] of born) { const t = (now - t0) / 480; if (t >= 1) { born.delete(h); houseMatrices(h, 1); } else houseMatrices(h, easeOutBack(Math.max(0, t))); }
  if (rig.orbit) rig.yaw += rig.orbit * dt;
  if (!Number.isFinite(rig.dist) || !Number.isFinite(rig.tx)) { resize(); Object.assign(rig, turkeyView()); }
  processFlatten(false);
  updateCars(dt, now);
  seaNormal.offset.x += dt * .008; seaNormal.offset.y += dt * .005; seaNormalFar.offset.copy(seaNormal.offset);
  { const ns = clamp(1.2 - Math.log10(rig.dist) * .4, .08, .55); for (const m of seaMats) m.normalScale.set(ns, ns); }
  const co = clamp((rig.dist - 600) / 900, 0, 1) * .5;
  for (const cl of clouds) { cl.position.x += dt * 4; if (cl.position.x > W + 300) cl.position.x = -300; cl.material.opacity = co; cl.visible = co > .01; }
  if (borderLine) borderLine.visible = rig.dist > 180;
  if (rig.dist > 250 && houseCount) {   // il daireleri
    const k = clamp((rig.dist - 250) / 400, 0, 1);
    for (let p = 0; p < NP; p++) {
      if (PROV_COUNT[p] !== provLast[p]) { provPulse[p] = 1; provLast[p] = PROV_COUNT[p]; }
      provPulse[p] = Math.max(0, provPulse[p] - dt * 3);
      const r = PROV_COUNT[p] ? (4 + Math.sqrt(PROV_COUNT[p]) * 2.1) * (1 + provPulse[p] * .35) * k : 0;
      _p.set(PROVINCES[p].x, heightAt(PROVINCES[p].x, PROVINCES[p].y) + .6, PROVINCES[p].y); _m.compose(_p, QI, _s.set(r || 1e-4, 1, r || 1e-4)); provDots.setMatrixAt(p, _m);
    }
    provDots.count = NP; provDots.instanceMatrix.needsUpdate = true;
  } else provDots.count = 0;
  for (let i = effects.length - 1; i >= 0; i--) if (!effects[i].update(now)) effects.splice(i, 1);
  applyCam();
  updateForest();
  if (selected >= 0 && selected < houseCount && !video) {
    const [x, z] = housePos(selected), s = clamp(rig.dist * .045, .9, 30);
    pin.visible = ring.visible = true; pin.position.set(x, .75 * s + Math.sin(now / 260) * .1 * s, z); pin.scale.setScalar(s); pin.rotation.y = now / 900;
    const k = (now % 1300) / 1300; ring.position.set(x, .06, z); ring.scale.setScalar(1 + k * 1.6); ring.material.opacity = 1 - k;
  } else pin.visible = ring.visible = false;
  if (placing && hover) {
    const b = placingAt(hover);
    ghost.visible = true; ghost.position.set(b.x + bw(b) / 2, 0, b.y + bh(b) / 2); ghost.scale.set(bw(b), 1.2, bh(b));
    ghost.material.color.set(canPlace(b) ? '#27ae60' : '#e74c3c');
  } else ghost.visible = false;
  flushImage();
  Object.values(P).forEach(p => p.flush());
  renderer.render(scene, camera);
  drawFx();
  updateLabels();
}

// ==========================================================
//  ANİMASYON + SES
// ==========================================================
let video = null;
function anim(dur, fn) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => {
      let t = dur <= 0 ? 1 : (now - t0) / dur;
      if (video && video.abort) t = 1;
      t = Math.min(1, t); fn(t, now);
      if (t < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}
const wait = ms => anim(ms, () => {});
let AC = null, soundOn = true, lastPop = 0;
function ensureAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
  if (AC && AC.state === 'suspended') AC.resume();
}
function beep(freq, len = .1, type = 'sine', vol = .14, slide = 1.6) {
  if (!AC || !soundOn) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * slide, t + len * .6);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + len);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + len + .02);
}
function pop(now) { if (now - lastPop < 45) return; lastPop = now; beep(420 + Math.random() * 380, .1); }
function ding() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .35, 'triangle', .11, 1.01), i * 90)); }

// ==========================================================
//  VİDEO MODU
// ==========================================================
const MILESTONES = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000];
const DEFAULT_CAPS = ['Dün Türkiye bomboştu.', 'Sonra {fark} kişi yorum yaptı.', 'Herkese kendi ilinde bir ev.', '{il} farklı ilde evler yükseldi.', 'En kalabalık il: {top}.', 'Şuna bakın.', 'Yarın sıra sende:'];
const DEFAULT_CTA = 'senin ilin kaçıncı?';
let exitResolve = null;
function pctFilled() {
  const p = NS ? houseCount / NS * 100 : 0;
  return p === 0 ? '0' : p < 0.01 ? '0,01' : p.toLocaleString('tr-TR', { maximumFractionDigits: p < 1 ? 3 : 1 });
}
function enterVideo() {
  video = { abort: false, timers: [] };
  document.body.classList.add('video'); $('vo').hidden = false;
  for (const id of ['voBanner', 'voCta', 'voCap', 'voIntro']) $(id).classList.remove('show', 's1', 's2', 's3');
  $('voCount').style.opacity = 0;
  $('voHandle').textContent = townName();
  selected = -1; closeCard(); ensureAudio();
}
function exitVideo() { if (!video) return; video.abort = true; if (exitResolve) { exitResolve(); exitResolve = null; } }
function finishVideo() {
  video.timers.forEach(clearTimeout); rig.orbit = 0;
  video = null; document.body.classList.remove('video'); $('vo').hidden = true;
  updateStats(); renderAdmin();
}
const setCount = n => { $('voNum').textContent = fmt(n); $('voSub').textContent = `${townName()} · ${provsWithHouses()} ilde ev var`; };
function showCaption(text) {
  const el = $('voCap'); el.classList.remove('show');
  if (!text) return;
  setTimeout(() => { el.textContent = text; el.classList.add('show'); }, 120);
}
function scheduleCaptions(total, vars) {
  const caps = (DATA.caps ?? DEFAULT_CAPS.join('\n')).split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => l.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m));
  caps.forEach((c, i) => video.timers.push(setTimeout(() => showCaption(c), 2200 + i * (total - 2200) / caps.length)));
}
async function introCard(day) {
  $('voDay').textContent = `gün ${day}`; $('voIntroDay').textContent = `GÜN ${day}`;
  Object.assign(rig, turkeyView()); flyTok++;
  const intro = $('voIntro'); intro.classList.add('show');
  for (const [i, ms] of [[1, 350], [2, 650], [3, 950]]) video.timers.push(setTimeout(() => { intro.classList.add('s' + i); beep(500 + i * 140, .12, 'triangle', .1); }, ms));
  await wait(2000);
  intro.classList.remove('show'); $('voCount').style.opacity = 1;
}
async function outro() {
  $('voCount').style.opacity = 0;
  $('voCta').innerHTML = `${esc(DATA.cta || DEFAULT_CTA)}<br><small>yorumuna ilini yaz ↓ · evin gelsin</small>`;
  $('voCta').classList.add('show');
  await flyTo({ ...turkeyView(), pitch: 82 * Math.PI / 180, dist: fitTurkeyDist() * 1.02 }, 3500);
  video.timers.push(setTimeout(() => showCaption('Yorum yapan herkese bir ev.'), 200));
  if (!video.abort) await new Promise(r => { exitResolve = r; });
  finishVideo();
}
// Bir ile in, evleri göster
async function visitProvince(pv, low) {
  const f = fitBox(PROV_BB[pv]);
  await flyTo({ ...f, dist: clamp(f.dist, 14, 160), pitch: 56 * Math.PI / 180, yaw: rig.yaw - .4 }, 2600);
  if (low) { rig.orbit = .09; await flyTo({ dist: clamp(f.dist * .3, 9, 22), pitch: 20 * Math.PI / 180, yaw: rig.yaw + .5 }, 2200); await wait(1500); }
  else { rig.orbit = .07; await wait(1700); }
  rig.orbit = 0;
}

// YORUM VİDEOSU: Türkiye'de evler illere yağar → en kalabalık illere iner → soru
async function playPeopleVideo(batch) {
  if (video || !batch?.list.length) return;
  const list = batch.list, prev = houseCount, day = dayCount() + 1;
  const counts = new Int32Array(NP); for (const [, p] of list) counts[p < 0 ? seedProv() : p]++;
  const top = [...counts].map((n, p) => [p, n]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  enterVideo(); setCount(prev);
  const growDur = Math.min(11000, 3500 + Math.log10(list.length + 1) * 1600);
  scheduleCaptions(2000 + growDur + 2200 + 3 * 4500, { fark: fmt(list.length), sayi: fmt(prev + list.length), il: top.length, top: PROVINCES[top[0][0]].name, gun: day });
  await introCard(day);
  // evler illere yağıyor (Türkiye görünümü, kamera hafif eğilir)
  let i = 0;
  await anim(growDur, (t, now) => {
    const e = t < 1 ? Math.sin(t * Math.PI / 2) ** 1.2 : 1, n = Math.round(list.length * e);
    let added = 0;
    for (; i < n; i++) { const [name, p] = list[i]; if (addHouse(p < 0 ? seedProv() : p, !video.abort, name)) added++; }
    if (added && !video.abort) pop(now);
    setCount(prev + i);
    rig.pitch = lerp(TOP, 80 * Math.PI / 180, easeInOut(t)); rig.dist = fitTurkeyDist() * lerp(1, .97, easeInOut(t));
  });
  for (; i < list.length; i++) { const [name, p] = list[i]; addHouse(p < 0 ? seedProv() : p, false, name); }
  DATA.log.push({ t: 'people', date: today(), list }); save(); rebuildOwnerIndex(); rebuildTrees(); PENDING = null;
  setCount(houseCount);
  const ms = MILESTONES.filter(m => prev < m && houseCount >= m).pop();
  const bn = $('voBanner');
  bn.textContent = ms ? `🎉 ${fmt(ms)} EV!` : `+${fmt(list.length)} EV · ${top.length} İL`;
  bn.classList.add('show'); ding(); if (ms) effects.push(makeFireworks(5000));
  await wait(2200); bn.classList.remove('show');
  // en kalabalık 3 il
  for (let k = 0; k < Math.min(3, top.length); k++) {
    const [pv, n] = top[k];
    video.timers.push(setTimeout(() => showCaption(`${k + 1}. ${PROVINCES[pv].name} — ${fmt(n)} ev`), 300));
    await visitProvince(pv, k === 0);
  }
  await outro();
}

// ESKİ YÖNTEM: takipçi sayısı kadar ev (tek il)
async function playVideo(target, introOnly = false) {
  if (video) return;
  target = Math.max(0, Math.floor(target));
  const pv = seedProv(), prev = houseCount, delta = Math.max(0, target - prev);
  enterVideo(); setCount(prev);
  const growDur = delta > 0 ? Math.min(10000, 3000 + Math.log10(delta + 1) * 1600) : 1500;
  if (!introOnly) scheduleCaptions(2000 + 3000 + growDur + 6000, { fark: fmt(delta), sayi: fmt(target), il: 1, top: PROVINCES[pv].name, gun: dayCount() + 1 });
  await introCard(dayCount() + (introOnly ? 0 : 1));
  const future = peekCells(pv, delta), c = PROVINCES[pv];
  const sb = PROV_BB[pv] || { x0: c.x - 6, y0: c.y - 6, x1: c.x + 6, y1: c.y + 6 };
  const A = fitBox(sb), fb = future.length ? future.reduce((b, cc) => growBox(b, cc % W, (cc / W) | 0), { ...sb }) : sb, Bx = fitBox(fb);
  await flyTo({ ...A, pitch: 58 * Math.PI / 180, yaw: -.5 }, 3000);
  if (!introOnly) {
    rig.orbit = .05;
    const l0 = Math.log(A.dist), l1 = Math.log(Bx.dist); let lastTrees = 0;
    await anim(growDur, (t, now) => {
      const e = t < 1 ? Math.sin(t * Math.PI / 2) ** 1.3 : 1, n = prev + Math.round(delta * e);
      let added = 0; while (houseCount < n && addHouse(pv, !video.abort)) added++;
      if (added && !video.abort) pop(now);
      if (now - lastTrees > 600) { lastTrees = now; rebuildTrees(); }
      setCount(houseCount);
      const ce = easeInOut(t); rig.dist = Math.exp(lerp(l0, l1, ce)); rig.tx = lerp(A.tx, Bx.tx, ce); rig.tz = lerp(A.tz, Bx.tz, ce);
    });
    while (houseCount < target && addHouse(pv, false));
    DATA.log.push({ t: 'grow', n: target, date: today() }); save(); rebuildOwnerIndex(); rebuildTrees();
    setCount(houseCount); rig.orbit = 0;
    await visitProvince(pv, true);
    await outro();
  } else { await wait(1500); finishVideo(); }
}

// ==========================================================
//  ARAYÜZ
// ==========================================================
const SUFFIX = { spine: 'Caddesi', ring: 'Halka Sokak', cul: 'Çıkmazı', curve: 'Sokak', perim: 'Bulvarı' };
function streetName(s) {
  const di = SLOT_DIST[s]; if (di < 0) return `${(SLOT_ROAD[s] % 120) + 1}. Sokak`;
  const r = CDIST[di].T.roads[SLOT_ROAD[s]];
  return `${MAH[Math.floor(hash2(di * 31 + SLOT_ROAD[s], 77) * MAH.length)]} ${SUFFIX[r.kind]}`;
}
function addressOf(h) {
  const s = HOUSE_SLOT[h], x = SLOT_X[s], z = SLOT_Z[s];
  return `${mahName((x / D) | 0, (z / D) | 0).replace('Mahallesi', 'Mah.')} ${streetName(s)} No: ${SLOT_NO[s]}, ${PROVINCES[SLOT_PROV[s]].name}`;
}
function neighborsOf(h) {
  const [x, z] = housePos(h), rot = SLOT_ROT[HOUSE_SLOT[h]], cx = Math.floor(x), cz = Math.floor(z);
  const best = { L: [-1, 9], R: [-1, 9], F: [-1, 9], Bk: [-1, 9] };
  const ax = Math.cos(rot), az = -Math.sin(rot), fx_ = Math.sin(rot), fz_ = Math.cos(rot);
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const X = cx + dx, Z = cz + dz; if (X < 0 || Z < 0 || X >= W || Z >= H) continue;
    const h2 = CELL_HOUSE[Z * W + X]; if (h2 < 0 || h2 === h || h2 >= houseCount) continue;
    const [x2, z2] = housePos(h2), vx = x2 - x, vz = z2 - z, d = Math.hypot(vx, vz); if (d > 3.2) continue;
    const lx = vx * ax + vz * az, lz = vx * fx_ + vz * fz_;
    const key = Math.abs(lx) >= Math.abs(lz) ? (lx > 0 ? 'L' : 'R') : (lz > 0 ? 'F' : 'Bk');
    if (d < best[key][1]) best[key] = [h2, d];
  }
  return best;
}
const ownerOf = h => DATA.owners[h + 1] ?? HOUSE_OWNER[h];
const houseName = h => ownerOf(h) ? '@' + ownerOf(h) : `Ev #${fmt(h + 1)}`;

function selectHouse(h, fly = true) {
  if (h < 0 || h >= houseCount) return;
  selected = h; showCard(h);
  if (fly) { const [x, z] = housePos(h); flyTo({ tx: x, tz: z, dist: 9 }, 1700); }
  if (!IS_ADMIN) history.replaceState(null, '', '#ev=' + (h + 1));
}
function closeCard() { $('card').hidden = true; selected = -1; }
function showCard(h) {
  const card = $('card'), owner = ownerOf(h), nb = neighborsOf(h);
  const nbs = [['◀ Sol', 'L'], ['Sağ ▶', 'R'], ['⬆ Karşı', 'F'], ['⬇ Arka', 'Bk']].map(([a, k]) => {
    const n = nb[k][0];
    return `<button ${n < 0 ? 'disabled' : `data-h="${n}"`}>${a}: ${n < 0 ? '—' : esc(houseName(n))}</button>`;
  }).join('');
  card.innerHTML = `
    <button class="x" id="cardX">✕</button>
    <div class="card-h"><div class="roof" style="background:${roofHex(h)}">🏠</div>
      <div><div class="t">${owner ? '@' + esc(owner) : 'Ev #' + fmt(h + 1)}</div><div class="o none">Ev #${fmt(h + 1)} · ${PROVINCES[houseProv(h)].name}</div></div></div>
    <div class="addr">📍 ${addressOf(h)}</div>
    ${owner ? '' : `<div class="claim">Bu ev henüz sahipsiz. Son videonun altına ilini yaz, evin gelsin! 🏡</div>`}
    <div class="nb-title">KOMŞULAR</div><div class="nb">${nbs}</div>
    <button class="btn" id="cardShare">🔗 Bu evin linkini kopyala</button>`;
  card.hidden = false;
  $('cardX').onclick = closeCard;
  card.querySelectorAll('.nb button[data-h]').forEach(b => b.onclick = () => selectHouse(+b.dataset.h));
  $('cardShare').onclick = () => {
    const url = location.origin + location.pathname + '#ev=' + (h + 1);
    navigator.clipboard?.writeText(url).then(() => toast('Link kopyalandı!'), () => toast(url));
  };
}
function search(q) {
  const raw = q.trim().replace(/^@/, ''), ql = raw.toLowerCase(); if (!ql) return [];
  const res = [], num = ql.replace(/^#/, ''), nq = norm(raw);
  for (const p of PROVINCES) if (norm(p.name).startsWith(nq) && nq.length >= 2) res.push({ p: p.i });
  if (/^\d+$/.test(num)) { const n = +num; if (n >= 1 && n <= houseCount) res.push({ h: n - 1 }); }
  const hits = OWNER_INDEX.filter(e => e[0].includes(ql)).sort((a, b) => (b[0].startsWith(ql) - a[0].startsWith(ql)) || a[0].length - b[0].length);
  for (const e of hits.slice(0, 8)) res.push({ h: e[1] - 1 });
  return res.slice(0, 10);
}
let resIdx = 0;
function renderResults() {
  const q = $('q').value, list = search(q), box_ = $('results');
  if (!q.trim()) { box_.innerHTML = ''; return; }
  if (!list.length) { box_.innerHTML = `<div class="res"><div><b>Bulunamadı</b><small>${houseCount ? 'Bu kullanıcının henüz evi yok' : 'Henüz hiç ev yok'}</small></div></div>`; return; }
  resIdx = clamp(resIdx, 0, list.length - 1);
  box_.innerHTML = list.map((r, i) => r.p !== undefined
    ? `<div class="res ${i === resIdx ? 'on' : ''}" data-i="${i}"><div class="dot" style="background:#2f80ed;display:grid;place-items:center">🗺️</div><div><b>${PROVINCES[r.p].name}</b><small>${fmt(PROV_COUNT[r.p])} ev</small></div></div>`
    : `<div class="res ${i === resIdx ? 'on' : ''}" data-i="${i}"><div class="dot" style="background:${roofHex(r.h)}"></div><div><b>${esc(houseName(r.h))}</b><small>Ev #${fmt(r.h + 1)} · ${PROVINCES[houseProv(r.h)].name}</small></div></div>`).join('');
  box_.querySelectorAll('.res[data-i]').forEach(el => el.onclick = () => pickResult(list[+el.dataset.i]));
}
function pickResult(r) {
  $('results').innerHTML = ''; $('q').blur();
  if (r.p !== undefined) { const bb = PROV_BB[r.p], c = PROVINCES[r.p]; flyTo(bb ? { ...fitBox(bb), dist: clamp(fitBox(bb).dist, 14, 160) } : { tx: c.x, tz: c.y, dist: 60 }, 1800); }
  else selectHouse(r.h);
}
function updateStats() {
  $('stats').innerHTML = `<span>🏠 ${fmt(houseCount)} ev</span><span>🗺️ ${provsWithHouses()} il</span><span class="muted">📅 Gün ${dayCount()}</span>`;
  $('brandTitle').textContent = DATA.town || 'Takipçi Şehri';
  $('brandHandle').textContent = DATA.handle ? '@' + DATA.handle : 'Yorum yap, ilinde evin olsun';
}
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
function goCity() {
  let best = -1; for (let p = 0; p < NP; p++) if (PROV_COUNT[p] && (best < 0 || PROV_COUNT[p] > PROV_COUNT[best])) best = p;
  if (best >= 0) { const f = fitBox(PROV_BB[best]); flyTo({ ...f, dist: clamp(f.dist, 14, 160) }, 1600); }
  else { flyTo(turkeyView(), 1400); toast('Henüz hiç ev yok'); }
}

// ---------- Fare / dokunmatik ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(UP, 0);
function groundAt(px, py) {
  applyCam(); ndc.set(px / vw * 2 - 1, -(py / vh) * 2 + 1); ray.setFromCamera(ndc, camera);
  const out = new THREE.Vector3(); return ray.ray.intersectPlane(groundPlane, out) ? out : null;
}
const pointers = new Map(); let down = null, pinch = null, grab = null;
const cv = renderer.domElement;
function zoomAt(px, py, f) {
  const g = groundAt(px, py), d0 = rig.dist;
  rig.dist = clamp(rig.dist * f, 2.5, fitTurkeyDist() * 1.5); rig.pitch = pitchFor(rig.dist);
  if (g) { const k = rig.dist / d0; rig.tx = g.x + (rig.tx - g.x) * k; rig.tz = g.z + (rig.tz - g.z) * k; }
  clampRig();
}
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); flyTok++;
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (pointers.size === 1) {
    down = { x: e.offsetX, y: e.offsetY, t: performance.now(), moved: false, rotate: e.button === 2 || e.shiftKey };
    grab = groundAt(e.offsetX, e.offsetY);
  } else { const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x) }; if (down) down.moved = true; }
});
cv.addEventListener('pointermove', e => {
  const gh = placing ? groundAt(e.offsetX, e.offsetY) : null; if (gh) hover = [Math.floor(gh.x), Math.floor(gh.z)];
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.offsetX - p.x; p.x = e.offsetX; p.y = e.offsetY;
  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.d / d); rig.yaw -= ang - pinch.a; pinch.d = d; pinch.a = ang;
  } else if (pointers.size === 1 && down) {
    if (Math.hypot(e.offsetX - down.x, e.offsetY - down.y) > 6) down.moved = true;
    if (down.rotate) rig.yaw -= dx * .006;
    else if (grab) { const g = groundAt(e.offsetX, e.offsetY); if (g) { rig.tx += grab.x - g.x; rig.tz += grab.z - g.z; clampRig(); } }
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 0 && down && !down.moved && performance.now() - down.t < 500) onTap(e.offsetX, e.offsetY);
  if (pointers.size === 0) { down = null; grab = null; }
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('wheel', e => { e.preventDefault(); flyTok++; zoomAt(e.offsetX, e.offsetY, Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0016))); }, { passive: false });

function pickHouse(px, py) {
  applyCam(); ndc.set(px / vw * 2 - 1, -(py / vh) * 2 + 1); ray.setFromCamera(ndc, camera);
  const meshes = [P.wallA.mesh, P.roofA.mesh, P.wallB.mesh, P.roofB.mesh];
  meshes.forEach(m => { m.boundingSphere = null; m.boundingBox = null; });
  const hit = ray.intersectObjects(meshes, false)[0];
  return hit ? hit.instanceId : -1;
}
const placingAt = ([x, y]) => { const b = { type: placing.type, w: placing.w, h: placing.h }; b.x = x - (bw(b) >> 1); b.y = y - (bh(b) >> 1); return b; };
function onTap(px, py) {
  if (video) return;
  const g = groundAt(px, py); if (!g) return;
  const x = Math.floor(g.x), y = Math.floor(g.z);
  if (placing) {
    const b = placingAt([x, y]);
    if (!canPlace(b)) { toast('Buraya konmaz (deniz, eğri yol ya da başka yapı var)'); return; }
    const e = { t: 'build', id: Date.now().toString(36), ...placing, x: b.x, y: b.y, date: today() };
    Object.keys(e).forEach(k => (e[k] === undefined || e[k] === '') && delete e[k]);
    DATA.log.push(e); placeBuilding(e); rebuildTrees(); save(); rebuildOwnerIndex(); renderAdmin();
    toast(`${BUILDINGS[e.type].name} eklendi!`); placing = null; cv.classList.remove('placing');
    return;
  }
  const h = rig.dist < 120 ? pickHouse(px, py) : -1;
  if (h >= 0 && h < houseCount) return selectHouse(h, false);
  if (x >= 0 && y >= 0 && x < W && y < H && STATE[y * W + x] === 3) return selectHouse(CELL_HOUSE[y * W + x], false);
  closeCard();
}

// ==========================================================
//  YÖNETİM PANELİ (3 adım + gelişmiş)
// ==========================================================
function showPending(batch, src) {
  PENDING = batch;
  const s = batch.stats, el = $('pending'); el.hidden = false;
  el.innerHTML = `<div><b>${fmt(batch.list.length)}</b> kişiye ev kurulacak · <b>${s.provs}</b> il</div>
    <div class="hint">${src} · ${fmt(s.total)} yorum · ${fmt(s.noProv)} kişi il yazmamış · ${fmt(s.dup)} tekrar/evi zaten var</div>
    <div class="top">${s.top.slice(0, 6).map(([p, n]) => `<span>${PROVINCES[p].name}</span><b>${fmt(n)}</b>`).join('')}</div>`;
  $('pPlay').disabled = !batch.list.length;
}
function renderAdmin() {
  if (!IS_ADMIN) return;
  $('aHandle').value = DATA.handle || '';
  $('aTown').value = DATA.town || '';
  $('aSeed').value = DATA.seed;
  $('aBList').innerHTML = buildings.map(b => `<div><span>${BUILDINGS[b.type].name.split(' ')[0]} ${esc(bLabel(b))}</span>
    <span><button data-go="${b.id}">git</button> <button data-del="${b.id}">sil</button></span></div>`).join('') || '<div>Henüz yapı yok</div>';
  $('aBList').querySelectorAll('[data-go]').forEach(el => el.onclick = () => { const b = buildings.find(b => b.id === el.dataset.go); flyTo({ tx: b.x + bw(b)/2, tz: b.y + bh(b)/2, dist: 28 }, 1500); });
  $('aBList').querySelectorAll('[data-del]').forEach(el => el.onclick = () => {
    if (!confirm('Yapı silinsin mi?')) return;
    DATA.log = DATA.log.filter(e => e.id !== el.dataset.del); save(); replay(); renderAdmin(); });
  $('aOwnerInfo').textContent = `${fmt(OWNER_INDEX.length)} evin sahibi belli`;
  $('aHistory').innerHTML = DATA.log.slice().reverse().map(e =>
    e.t === 'people' ? `<div><span>💬 ${e.date}</span><b>+${fmt(e.list.length)} ev</b></div>`
    : e.t === 'grow' ? `<div><span>📈 ${e.date}</span><b>${fmt(e.n)}</b></div>`
    : `<div><span>🏗️ ${e.date}</span><span>${BUILDINGS[e.type]?.name || e.type}</span></div>`).join('') || '<div>Boş</div>';
}
function setupAdmin() {
  $('admin').hidden = false;
  // sekmeler
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    document.querySelectorAll('.tabp').forEach(p => p.hidden = p.dataset.p !== t.dataset.tab);
  });
  // 1a) Instagram
  try { $('igToken').value = sessionStorage.getItem('igToken') || ''; } catch {}
  $('igPosts').onclick = async () => {
    const tok = $('igToken').value.trim(); if (!tok) return toast('Önce erişim anahtarını yapıştır');
    try { sessionStorage.setItem('igToken', tok); } catch {}
    $('igPosts').textContent = 'Getiriliyor…';
    try {
      const j = await igGet(`${IG}/me/media?fields=id,caption,timestamp,comments_count&limit=25&access_token=${encodeURIComponent(tok)}`);
      $('igPost').innerHTML = (j.data || []).map(m => `<option value="${m.id}">${esc((m.caption || '(açıklamasız)').slice(0, 40))} · 💬 ${fmt(m.comments_count || 0)}</option>`).join('');
      $('igPost').hidden = $('igFetch').hidden = false;
    } catch (e) { toast('Instagram hatası: ' + e.message); }
    $('igPosts').textContent = 'Gönderilerimi getir';
  };
  $('igFetch').onclick = async () => {
    const tok = $('igToken').value.trim(), id = $('igPost').value;
    $('igFetch').disabled = true;
    try {
      const all = await igAll(`${IG}/${id}/comments?fields=id,text,username,timestamp&limit=50&access_token=${encodeURIComponent(tok)}`,
        n => $('igFetch').textContent = `Çekiliyor… ${fmt(n)} yorum`);
      showPending(buildPeople(all), 'Instagram');
    } catch (e) { toast('Instagram hatası: ' + e.message); }
    $('igFetch').disabled = false; $('igFetch').textContent = 'Yorumları çek';
  };
  // 1b) dosya
  $('cFileBtn').onclick = () => $('cFile').click();
  $('cFile').onchange = async () => {
    const f = $('cFile').files[0]; if (!f) return;
    try { showPending(buildPeople(parseCommentFile(await f.text(), f.name)), f.name); } catch (e) { toast('Dosya okunamadı: ' + e.message); }
    $('cFile').value = '';
  };
  // 1c) deneme
  $('demoGo').onclick = () => showPending(buildPeople(demoComments(clamp(+$('demoN').value || 3000, 10, 50000))), 'Sahte yorumlar');
  // 2) video
  $('pPlay').onclick = () => { if (PENDING) { $('pPlay').disabled = true; $('pending').hidden = true; playPeopleVideo(PENDING); } };
  $('aFrame').onchange = () => { stage.classList.toggle('frame916', $('aFrame').checked); resize(); };
  stage.classList.toggle('frame916', $('aFrame').checked); resize(); Object.assign(rig, turkeyView());
  // 3) kaydet
  $('aExport').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(DATA)], { type: 'application/json' }));
    a.download = 'data.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  // gelişmiş
  $('aSeed').innerHTML = PROVINCES.map(c => `<option>${c.name}</option>`).join('');
  $('aBType').innerHTML = Object.entries(BUILDINGS).map(([k, d]) => `<option value="${k}">${d.name}${d.model ? '' : ` (${d.w}×${d.h})`}</option>`).join('');
  $('aEvents').innerHTML = Object.entries(EVENTS).map(([k, d]) => `<button class="btn alt" data-ev="${k}" style="flex:1 1 45%">${d.name}</button>`).join('');
  $('aEvents').querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { ensureAudio(); EVENTS[b.dataset.ev].run(); });
  $('admMin').onclick = () => $('admin').classList.toggle('min');
  $('aHandle').onchange = () => { DATA.handle = $('aHandle').value.trim().replace(/^@/, ''); save(); updateStats(); };
  $('aTown').onchange = () => { DATA.town = $('aTown').value.trim(); save(); updateStats(); };
  $('aSeed').onchange = () => { DATA.seed = $('aSeed').value; save(); };
  $('aCaps').value = DATA.caps ?? DEFAULT_CAPS.join('\n');
  $('aCta').value = DATA.cta || '';
  $('aCaps').onchange = () => { DATA.caps = $('aCaps').value; save(); };
  $('aCta').onchange = () => { DATA.cta = $('aCta').value.trim(); save(); };
  $('aSound').onchange = () => { soundOn = $('aSound').checked; };
  const readCount = () => { const v = parseInt($('aCount').value, 10); if (!(v >= 0)) { toast('Sayı gir'); return null; } return v; };
  $('aPlay').onclick = () => { const v = readCount(); if (v === null) return; $('aCount').value = ''; playVideo(v); };
  $('aSilent').onclick = () => { const v = readCount(); if (v === null) return; $('aCount').value = '';
    DATA.log.push({ t: 'grow', n: v, date: today() }); save(); replay(); renderAdmin(); goCity(); };
  $('aIntro').onclick = () => playVideo(houseCount, true);
  $('aPlace').onclick = () => {
    const type = $('aBType').value, def = BUILDINGS[type], p = { type };
    if (def.model) {
      const file = prompt('models/ klasöründeki dosya adı', 'truva-ati.glb'); if (!file) return;
      p.file = file.trim(); p.w = p.h = clamp(parseInt(prompt('Kaç hücre yer kaplasın? (ör. 4)', '4'), 10) || 4, 1, 30);
    }
    const label = def.ask ? prompt(def.ask, def.def) : ''; if (label === null) return;
    p.label = label.trim();
    const col = parseColor(prompt('Renk (mor, kırmızı, mavi, altın… veya #hex, boş bırakılabilir)', '') || ''); if (col) p.color = col;
    placing = p; cv.classList.add('placing');
    toast('Haritada bir yere tıkla (iptal: Esc)');
  };
  $('aAssign').onclick = () => {
    const lines = $('aOwners').value.split('\n').map(l => l.trim()).filter(Boolean);
    const b = buildPeople(lines.map(l => { const m = l.match(/^@?([A-Za-z0-9._]+)\s+(.*)$/); return m ? { username: m[1], text: m[2] } : {}; }));
    if (!b.list.length) return toast('Geçerli satır yok (kullanıcı_adı il)');
    const e = { t: 'people', date: today(), list: b.list }; DATA.log.push(e); applyEntry(e, false);
    save(); rebuildOwnerIndex(); rebuildTrees(); updateStats(); renderAdmin(); $('aOwners').value = ''; toast(`${b.list.length} ev eklendi`);
  };
  $('aImport').onclick = () => $('aFile').click();
  $('aFile').onchange = async () => {
    const f = $('aFile').files[0]; if (!f) return;
    try { DATA = Object.assign(defaultData(), JSON.parse(await f.text())); save(); replay(); renderAdmin(); goCity(); toast('Veri yüklendi'); }
    catch (e) { toast('Dosya okunamadı'); }
    $('aFile').value = '';
  };
  $('aReset').onclick = () => {
    if (!confirm('Bütün evler, yapılar ve sahipler silinsin mi?')) return;
    DATA = defaultData(); PENDING = null; $('pending').hidden = true; $('pPlay').disabled = true;
    save(); replay(); renderAdmin(); closeCard(); Object.assign(rig, turkeyView());
  };
  renderAdmin();
}

// ==========================================================
//  BAŞLAT
// ==========================================================
function bindUI() {
  $('q').addEventListener('input', () => { resIdx = 0; renderResults(); });
  $('q').addEventListener('keydown', e => {
    const list = search($('q').value);
    if (e.key === 'ArrowDown') { resIdx++; renderResults(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { resIdx--; renderResults(); e.preventDefault(); }
    else if (e.key === 'Enter' && list.length) pickResult(list[clamp(resIdx, 0, list.length - 1)]);
    else if (e.key === 'Escape') { $('q').value = ''; renderResults(); }
  });
  $('q').placeholder = 'Kullanıcı adı veya il ara…';
  $('zIn').onclick = () => { flyTok++; zoomAt(vw / 2, vh / 2, 1 / 1.8); };
  $('zOut').onclick = () => { flyTok++; zoomAt(vw / 2, vh / 2, 1.8); };
  $('zTr').onclick = () => flyTo(turkeyView(), 1600);
  $('zCity').onclick = goCity;
  $('voExit').onclick = exitVideo;
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (video) exitVideo(); else if (placing) { placing = null; cv.classList.remove('placing'); toast('İptal edildi'); } }
  });
  window.addEventListener('resize', () => { resize(); clampRig(); });
  new ResizeObserver(() => resize()).observe(stage);
  window.addEventListener('hashchange', () => { const m = location.hash.match(/ev=(\d+)/); if (m) selectHouse(+m[1] - 1); });
}

(async function boot() {
  resize(); bindUI();
  await new Promise(r => setTimeout(r, 30));
  buildLand();
  buildOrder();
  DATA = await loadData();
  replay();
  Object.assign(rig, turkeyView()); clampRig();
  if (IS_ADMIN) setupAdmin();
  $('loading').remove();
  requestAnimationFrame(frame);
  const m = location.hash.match(/ev=(\d+)/);
  if (m && +m[1] <= houseCount) setTimeout(() => selectHouse(+m[1] - 1), 400);
  window.G = { rig, playVideo, playPeopleVideo, exitVideo, EVENTS, get houseCount() { return houseCount; }, get DATA() { return DATA; },
    replay, flyTo, housePos, neighborsOf, addressOf, detectProvince, buildPeople, demoComments, parseCommentFile, get NS() { return NS; }, PROV_COUNT, get PENDING() { return PENDING; } };
})();
