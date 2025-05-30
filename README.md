# Yuz Tahlili - Face Analysis Application

Bu loyiha Salohiddin O'rinboyev uchun Jakhongir Ganiev tomonidan qilingan diplom loyihasi (2025)

## 🎯 Loyiha haqida

Yuz Tahlili - bu real vaqt rejimida yuzlarni aniqlash, tahlil qilish va tanib olish imkonini beruvchi zamonaviy veb-ilova. Ilova quyidagi asosiy funksiyalarni taqdim etadi:

- Real vaqt rejimida yuz aniqlash
- Yuz tahlili (yosh, jins, his-tuyg'ular, irq)
- Yuzlarni tanib olish va ro'yxatdan o'tkazish
- Avtomatik tahlil rejimi
- Chiroyli va intuitiv foydalanuvchi interfeysi

## 🚀 Texnologiyalar

- **Backend:**
  - Python 3.8+
  - FastAPI
  - DeepFace
  - OpenCV
  - SQLite
  - TensorFlow

- **Frontend:**
  - HTML5
  - CSS3
  - JavaScript (ES6+)
  - Electron.js (desktop ilova uchun)

## 📋 Talablar

- Python 3.8 yoki undan yuqori versiya
- Node.js 14+ (desktop ilova uchun)
- Kamera
- Internet ulanishi (dastlabki modellarni yuklash uchun)

## 🛠️ O'rnatish

1. Repozitoriyani klonlang:
   ```bash
   git clone https://github.com/ganiyevuz/face-analysis.git
   cd face-analysis
   ```

2. Python virtual muhitini yarating va faollashtiring:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # yoki
   .\venv\Scripts\activate  # Windows
   ```

3. Kerakli paketlarni o'rnating:
   ```bash
   pip install -r requirements.txt
   ```

4. Desktop ilovani yaratish uchun Node.js paketlarini o'rnating:
   ```bash
   npm install
   ```

## 🏃‍♂️ Ishga tushirish

### Veb-ilova sifatida

1. Avval backend serverni ishga tushiring:
   ```bash
   # Terminal 1
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. Keyin brauzerda oching: `http://localhost:8000`

### Desktop ilova sifatida

1. Avval backend serverni ishga tushiring:
   ```bash
   # Terminal 1
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. Keyin Electron ilovasini ishga tushiring:
   ```bash
   # Terminal 2
   npm run dev
   ```

> ⚠️ **Muhim**: Desktop ilova ishlashi uchun backend server avval ishga tushirilishi kerak. Agar backend server ishlamayotgan bo'lsa, Electron ilovasi xatolik ko'rsatadi.

### Yaratish (Build)

Desktop ilovani yaratish uchun:

```bash
# Backend server ishlayotganini tekshiring
# Keyin quyidagi buyruqni ishga tushiring
npm run build
```

## 📱 Foydalanish

1. Ilovani oching
2. Kameraga ruxsat bering
3. Avtomatik tahlil rejimini yoqing yoki "Tahlil qilish" tugmasini bosing
4. Yuzni ro'yxatdan o'tkazish uchun ismni kiriting va "Ro'yxatdan o'tkazish" tugmasini bosing

## 🔧 Sozlamalar

Ilova quyidagi sozlamalarni o'z ichiga oladi:

- Tahlil intervali: 700ms
- Minimal so'rovlar orasidagi vaqt: 500ms
- Yuz aniqlash ishonchliligi: 60%
- Kamera o'lchami: 1280x720 (ideal)

## 📁 Loyiha tuzilishi

```
face-analysis/
├── main.py              # Asosiy FastAPI ilovasi
├── db.py               # Ma'lumotlar bazasi operatsiyalari
├── requirements.txt    # Python paketlari
├── package.json       # Node.js paketlari
├── static/            # Statik fayllar
│   ├── style.css     # Stil fayllari
│   ├── script.js     # Frontend JavaScript
│   └── icon.svg      # Ilova ikonkasi
├── templates/         # HTML shablonlar
│   └── index.html    # Asosiy sahifa
└── models/           # DeepFace modellari
```

## 🤝 Hissa qo'shish

1. Repozitoriyani fork qiling
2. Yangi branch yarating (`git checkout -b feature/amazing-feature`)
3. O'zgarishlaringizni commit qiling (`git commit -m 'Add amazing feature'`)
4. Branchingizga push qiling (`git push origin feature/amazing-feature`)
5. Pull Request yarating

## 📝 Lisensiya

Bu loyiha MIT litsenziyasi ostida tarqatilgan. Batafsil ma'lumot uchun `LICENSE` faylini ko'ring.

## 👨‍💻 Muallif

- **Jakhongir Ganiev** - *Salohiddin O'rinboyev uchun diplom loyihasi*
- GitHub: [@ganiyevuz](https://github.com/ganiyevuz)

## 🙏 Minnatdorchilik

- **Salohiddin O'rinboyev** - *Diplom loyihasi uchun g'oya va yo'naltiruvchi*
- DeepFace jamoasiga yuz tahlili uchun ajoyib kutubxona taqdim etgani uchun
- FastAPI jamoasiga tezkor va zamonaviy veb-freymvork yaratgani uchun
- Electron.js jamoasiga desktop ilovalar yaratish uchun ajoyib platforma taqdim etgani uchun