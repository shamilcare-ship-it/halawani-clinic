import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("bookings.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    duration TEXT NOT NULL,
    price TEXT NOT NULL,
    icon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    image TEXT NOT NULL,
    video_url TEXT,
    audio_url TEXT
  );

  CREATE TABLE IF NOT EXISTS academy_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date_range TEXT NOT NULL,
    location TEXT NOT NULL,
    image TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Seed initial data if empty
const seedData = () => {
  const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services").get() as any;
  if (serviceCount.count === 0) {
    const insertService = db.prepare("INSERT INTO services (id, title, description, duration, price, icon) VALUES (?, ?, ?, ?, ?, ?)");
    insertService.run("general-pt", "جلسة علاج طبيعي عامة", "جلسة شاملة تشمل التقييم والعلاج اليدوي والكهربائي بأحدث التقنيات.", "40 دقيقة", "200 شيكل", "Activity");
    insertService.run("chiropractic", "كيروبراكتيك وتقويم العمود الفقري", "تقويم وتأهيل العمود الفقري والمفاصل بتقنيات يدوية متخصصة لتخفيف الآلام.", "40 دقيقة", "250 شيكل", "Stethoscope");
    insertService.run("sports-injuries", "الإصابات الرياضية والحوادث", "إعادة تأهيل متكاملة للرياضيين وإصابات الملاعب والحوادث للعودة للنشاط الطبيعي.", "40 دقيقة", "200 شيكل", "Dumbbell");
    insertService.run("jaw-dislocation", "تقويم الفك وخلع الولادة", "تخصص دقيق في تقويم مفصل الفك وعلاج حالات خلع الولادة ونزع الخوفة.", "30 دقيقة", "200 شيكل", "Baby");
    insertService.run("stroke-rehab", "تأهيل الجلطات والباركنسون", "برامج تأهيلية مكثفة لمرضى الجلطات الدماغية والباركنسون وحالات التوحد.", "40 دقيقة", "200 شيكل", "Brain");
    insertService.run("cupping", "الحجامة العلاجية", "حجامة علمية مدروسة لتنشيط الدورة الدموية والتخلص من السموم والآلام.", "30 دقيقة", "150 شيكل", "Droplets");
  }

  const tipCount = db.prepare("SELECT COUNT(*) as count FROM tips").get() as any;
  if (tipCount.count === 0) {
    const insertTip = db.prepare("INSERT INTO tips (title, excerpt, content, category, date, image) VALUES (?, ?, ?, ?, ?, ?)");
    insertTip.run("أهمية التمدد الصباحي", "تعرف على كيفية تحسين مرونة جسمك في 5 دقائق فقط كل صباح.", "التمدد الصباحي يساعد على تنشيط الدورة الدموية وتقليل تيبس المفاصل...", "تمارين", "2026-02-20", "https://picsum.photos/seed/stretch/800/600");
    insertTip.run("وضعية الجلوس الصحيحة", "كيف تتجنب آلام الظهر والرقبة أثناء العمل المكتبي الطويل.", "الجلوس لفترات طويلة يتطلب وضعية تدعم العمود الفقري بشكل سليم...", "نصائح", "2026-02-18", "https://picsum.photos/seed/posture/800/600");
    insertTip.run("تمارين الرقبة والأكتاف", "تمارين بسيطة وفعالة لتخفيف التشنجات العضلية في منطقة الرقبة والأكتاف.", "تعتبر تمارين إطالة الرقبة وتقوية عضلات الأكتاف ضرورية جداً لمن يقضون ساعات طويلة أمام الشاشات...", "تمارين", "2026-02-21", "https://picsum.photos/seed/neck-shoulder/800/600");
  }

  const academyCount = db.prepare("SELECT COUNT(*) as count FROM academy_info").get() as any;
  if (academyCount.count === 0) {
    db.prepare("INSERT INTO academy_info (id, title, description, date_range, location, image) VALUES (1, ?, ?, ?, ?, ?)").run(
      "دورة المساج العلاجي 2026",
      "انضم إلينا في دورة مكثفة ومعتمدة لتعلم أصول المساج العلاجي والتقنيات الحديثة في شرقي القدس.",
      "23 مارس – 09 يونيو 2026",
      "أكاديمية ومركز لمسة شفاء – شرقي القدس",
      "https://picsum.photos/seed/academy/800/1000"
    );
  }

  const adminCount = db.prepare("SELECT COUNT(*) as count FROM admin_users").get() as any;
  if (adminCount.count === 0) {
    // Default admin: admin / admin123
    db.prepare("INSERT INTO admin_users (username, password) VALUES (?, ?)").run("admin", "admin123");
  }
};

seedData();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM admin_users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ success: true, token: "fake-jwt-token" });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Public Data Routes
  app.get("/api/services", (req, res) => {
    const services = db.prepare("SELECT * FROM services").all();
    res.json(services);
  });

  app.get("/api/tips", (req, res) => {
    const tips = db.prepare("SELECT * FROM tips ORDER BY date DESC").all();
    res.json(tips);
  });

  app.get("/api/academy", (req, res) => {
    const info = db.prepare("SELECT * FROM academy_info WHERE id = 1").get();
    res.json(info);
  });

  // Admin Update Routes (Simplified, no real JWT check for this demo)
  app.post("/api/admin/services", (req, res) => {
    const { id, title, description, duration, price, icon } = req.body;
    db.prepare("UPDATE services SET title = ?, description = ?, duration = ?, price = ?, icon = ? WHERE id = ?")
      .run(title, description, duration, price, icon, id);
    res.json({ success: true });
  });

  app.post("/api/admin/tips", (req, res) => {
    const { id, title, excerpt, content, category, date, image, video_url, audio_url } = req.body;
    if (id) {
      db.prepare("UPDATE tips SET title = ?, excerpt = ?, content = ?, category = ?, date = ?, image = ?, video_url = ?, audio_url = ? WHERE id = ?")
        .run(title, excerpt, content, category, date, image, video_url, audio_url, id);
    } else {
      db.prepare("INSERT INTO tips (title, excerpt, content, category, date, image, video_url, audio_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(title, excerpt, content, category, date, image, video_url, audio_url);
    }
    res.json({ success: true });
  });

  app.post("/api/admin/academy", (req, res) => {
    const { title, description, date_range, location, image } = req.body;
    db.prepare("UPDATE academy_info SET title = ?, description = ?, date_range = ?, location = ?, image = ? WHERE id = 1")
      .run(title, description, date_range, location, image);
    res.json({ success: true });
  });

  // API routes
  app.post("/api/bookings", (req, res) => {
    const { name, phone, service, date, time, notes } = req.body;
    
    if (!name || !phone || !service || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const stmt = db.prepare(
        "INSERT INTO bookings (name, phone, service, date, time, notes) VALUES (?, ?, ?, ?, ?, ?)"
      );
      stmt.run(name, phone, service, date, time, notes);

      // Simulate sending Email/SMS
      console.log(`
        --- SIMULATED NOTIFICATION ---
        To: shamilcare@gmail.com / 0585578777
        Subject: New Booking Confirmed
        Details:
        - Name: ${name}
        - Phone: ${phone}
        - Service: ${service}
        - Date: ${date}
        - Time: ${time}
        - Notes: ${notes || 'N/A'}
        ------------------------------
      `);

      res.json({ success: true, message: "Booking confirmed successfully" });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save booking" });
    }
  });

  app.get("/api/bookings", (req, res) => {
    const bookings = db.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all();
    res.json(bookings);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
