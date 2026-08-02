const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

// Load .env file if present
[path.join(__dirname, '.env'), path.join(__dirname, '../.env')].forEach(envPath => {
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'bound-super-secret-key-2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// --- Authentication Routes ---

app.post('/v1/auth/register', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Please provide all fields' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);

  const sql = `INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)`;
  db.run(sql, [firstName, lastName, email, hashedPassword], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    const token = jwt.sign({ id: this.lastID }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: this.lastID, firstName, lastName, email } });
  });
});

app.post('/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } });
  });
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey === 'bound-admin-secret-2026') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Invalid Admin Key' });
  }
};

// --- User Profile Routes ---

app.get('/v1/users/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, firstName, lastName, email, promptpayId, qrCodeUrl FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  });
});

app.put('/v1/users/profile', authenticateToken, (req, res) => {
  const { promptpayId } = req.body;
  db.run('UPDATE users SET promptpayId = ? WHERE id = ?', [promptpayId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, promptpayId });
  });
});

app.post('/v1/users/qrcode', authenticateToken, upload.single('qrCode'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const qrCodeUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  db.run('UPDATE users SET qrCodeUrl = ? WHERE id = ?', [qrCodeUrl, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, qrCodeUrl });
  });
});

// --- Protected Transaction Routes ---

app.get('/v1/transactions', authenticateToken, (req, res) => {
  db.all('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formattedRows = rows.map(r => ({ ...r, id: r.id.toString(), amount: Number(r.amount) }));
    res.json(formattedRows);
  });
});

app.post('/v1/transactions', authenticateToken, upload.single('receipt'), (req, res) => {
  const { date, amount, type, mainCategory, subcategory, notes, title, seriesId } = req.body;
  const userId = req.user.id;
  let receiptUrl = null;
  if (req.file) {
    receiptUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  const sql = `INSERT INTO transactions (userId, date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [userId, date, amount, type, mainCategory, subcategory, notes || '', title || '', seriesId || null, receiptUrl];
  
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      id: this.lastID.toString(), userId, date, amount, type, mainCategory, subcategory, notes, title, seriesId, receiptUrl
    });
  });
});

app.delete('/v1/transactions/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM transactions WHERE id = ? AND userId = ?', [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deletedID: req.params.id });
  });
});

app.delete('/v1/transactions/series/:seriesId', authenticateToken, (req, res) => {
  db.run('DELETE FROM transactions WHERE seriesId = ? AND userId = ?', [req.params.seriesId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deletedCount: this.changes });
  });
});

app.delete('/v1/transactions/all', authenticateToken, (req, res) => {
  db.run('DELETE FROM transactions WHERE userId = ?', [req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deletedCount: this.changes });
  });
});

// --- AI Assistant Routes ---

app.post('/v1/ai/chat', authenticateToken, async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const userId = req.user.id;

  try {
    // 1. Get user details and transactions to build financial context
    db.get('SELECT firstName, lastName FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC', [userId], async (err, transactions) => {
        if (err) return res.status(500).json({ error: err.message });

        // Calculate summary metrics
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        const balance = totalIncome - totalExpense;

        // Group expenses by subcategory
        const expenseByCat = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
          expenseByCat[t.subcategory] = (expenseByCat[t.subcategory] || 0) + Number(t.amount);
        });

        const recentTxs = transactions.slice(0, 5).map(t => `${t.date}: ${t.type === 'income' ? '+' : '-'}${t.amount} บาท (${t.subcategory || t.mainCategory}) - ${t.notes || t.title || 'ไม่มีหมายเหตุ'}`).join('\n');

        const userName = user ? `${user.firstName} ${user.lastName}` : 'ผู้ใช้งาน';
        
        const contextText = `ข้อมูลสรุปทางการเงินของคุณ ${userName}:
- ยอดเงินคงเหลือสุทธิ: ${balance.toLocaleString('th-TH')} บาท
- รายรับรวมทั้งหมด: ${totalIncome.toLocaleString('th-TH')} บาท
- รายจ่ายรวมทั้งหมด: ${totalExpense.toLocaleString('th-TH')} บาท
- หมวดหมู่รายจ่ายที่เกิดขึ้น: ${JSON.stringify(expenseByCat)}
- 5 รายการล่าสุด:
${recentTxs || 'ไม่มีรายการล่าสุด'}
`;

        const systemInstruction = `คุณคือ "BounD AI" ผู้ช่วยการเงินส่วนบุคคลที่ชาญฉลาด มีความเป็นมิตร สุภาพ และให้คำแนะนำทางการเงินที่เป็นประโยชน์ ตรงจุด เข้าใจง่าย ตอบเป็นภาษาไทยเป็นหลัก
ใช้อิโมจิประกอบให้น่าอ่าน ตอบกระชับ ไม่ยาวเกินไป และอ้างอิงข้อมูลทางการเงินของผู้ใช้เมื่อเหมาะสม`;

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (apiKey) {
          try {
            // Build conversation payload for Gemini API
            const contents = [];
            
            // Add system context & user finance state in prompt
            const promptWithContext = `[บริบทการเงินปัจจุบันของผู้ใช้]\n${contextText}\n\n[คำถามของผู้ใช้]: ${message}`;

            if (history && Array.isArray(history)) {
              history.slice(-6).forEach(item => {
                contents.push({
                  role: item.sender === 'user' ? 'user' : 'model',
                  parts: [{ text: item.text }]
                });
              });
            }

            contents.push({
              role: 'user',
              parts: [{ text: promptWithContext }]
            });

            const modelsToTry = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'];

            for (const modelName of modelsToTry) {
              try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                  })
                });

                if (response.ok) {
                  const data = await response.json();
                  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (reply) {
                    return res.json({ reply, source: 'gemini' });
                  }
                }
              } catch (singleModelErr) {
                console.error(`Model ${modelName} call failed:`, singleModelErr.message);
              }
            }
          } catch (geminiErr) {
            console.error('Gemini API call error:', geminiErr);
          }
        }

        // Smart Fallback Assistant response if no API key or API call failed
        let fallbackReply = '';
        const msgLower = message.toLowerCase();

        if (msgLower.includes('วิเคราะห์') || msgLower.includes('สรุป') || msgLower.includes('ภาพรวม')) {
          fallbackReply = `📊 **สรุปภาพรวมการเงินของคุณ ${userName}**\n\n` +
            `• **ยอดเงินคงเหลือปัจจุบัน:** ${balance.toLocaleString('th-TH')} บาท\n` +
            `• **รายรับรวม:** +${totalIncome.toLocaleString('th-TH')} บาท\n` +
            `• **รายจ่ายรวม:** -${totalExpense.toLocaleString('th-TH')} บาท\n\n` +
            (balance < 0 
              ? `⚠️ ยอดเงินคงเหลือติดลบ แนะนำให้ชะลอรายจ่ายฟุ่มเฟือยและตรวจสอบหมวดหมู่รายจ่ายคงที่ครับ`
              : `💡 การเงินของคุณค่อนข้างมั่นคง! มีเงินคงเหลือคิดเป็น ${totalIncome > 0 ? Math.round((balance/totalIncome)*100) : 0}% ของรายรับรวมครับ`);
        } else if (msgLower.includes('ออม') || msgLower.includes('เก็บเงิน') || msgLower.includes('เป้าหมาย')) {
          fallbackReply = `💡 **คำแนะนำการออมเงินจาก BounD AI**\n\n` +
            `1. **กฎ 50/30/20:** แบ่งรายรับเป็น ค่าใช้จ่ายจำเป็น 50%, ความสุขส่วนตัว 30%, และเงินออม 20%\n` +
            `2. **ออมก่อนใช้:** ตั้งโอนเงินเข้าบัญชีออมทันทีที่รายรับเข้าอย่างน้อย 10-20%\n` +
            `3. **ตั้งสำรองฉุกเฉิน:** ควรมีเงินสำรอง 3-6 เท่าของรายจ่ายประจำเดือน (${(totalExpense * 3).toLocaleString('th-TH')} บาท)`;
        } else if (msgLower.includes('จ่าย') || msgLower.includes('หมวดหมู่') || msgLower.includes('ฟุ่มเฟือย')) {
          const topSubcat = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1])[0];
          fallbackReply = `🛍️ **วิเคราะห์หมวดหมู่การใช้จ่าย**\n\n` +
            `• คุณมีรายจ่ายรวมทั้งหมด -${totalExpense.toLocaleString('th-TH')} บาท\n` +
            (topSubcat ? `• หมวดหมู่ที่คุณจ่ายมากที่สุดคือ **${topSubcat[0]}** รวมเป็นเงิน -${topSubcat[1].toLocaleString('th-TH')} บาท\n` : '') +
            `\n💡 **Tip:** ลองตั้งเป้าหมายลดรายจ่ายหมวดหมู่นี้ลง 10-15% จะช่วยให้มีเงินออมเพิ่มขึ้นได้ครับ!`;
        } else {
          fallbackReply = `สวัสดีครับคุณ ${userName}! 🤖 ผมคือ **BounD AI Assistant** ยินดีช่วยคำนวณและวางแผนการเงินครับ\n\n` +
            `ขณะนี้คุณมียอดเงินคงเหลือสุทธิ **${balance.toLocaleString('th-TH')} บาท**\n\n` +
            `คุณสามารถสอบถามเกี่ยวกับ:\n` +
            `• *"ช่วยวิเคราะห์ภาพรวมการเงิน"* \n` +
            `• *"ขอคำแนะนำในการออมเงิน"* \n` +
            `• *"หมวดหมู่ไหนที่จ่ายมากที่สุด?"*\n\n` +
            `*(โน้ต: หากต้องการเปิดใช้งานพลัง Gemini AI เต็มรูปแบบ สามารถใส่ GEMINI_API_KEY ในไฟล์ .env ได้เลยครับ)*`;
        }

        res.json({ reply: fallbackReply, source: 'fallback' });
      });
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// --- Admin Routes ---

app.get('/v1/admin/users', authenticateAdmin, (req, res) => {
  db.all('SELECT id, firstName, lastName, email FROM users ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/v1/admin/stats', authenticateAdmin, (req, res) => {
  db.get('SELECT COUNT(*) as totalUsers FROM users', [], (err, userResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT COUNT(*) as totalTx, SUM(amount) as totalAmount FROM transactions', [], (err, txResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        totalUsers: userResult.totalUsers,
        totalTransactions: txResult.totalTx,
        totalAmount: txResult.totalAmount || 0
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
