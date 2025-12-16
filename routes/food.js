// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// routes/food.js
// 식단(섭취 칼로리) 기록

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const { FoodLog } = require('../models');
const healthRouter = require('./health'); // recalcTodayCalorieForUser 사용

// 업로드 폴더 준비
const uploadPath = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// multer 설정 (여러 파일 업로드 지원)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) =>
    cb(null, Date.now() + '_' + file.originalname),
});
const upload = multer({ storage });

// helper: 오늘 날짜 문자열(YYYY-MM-DD)
function todayStr() {
  const now = new Date();         // 로컬 시간
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;        // 예: 2025-12-05
}

// GET /food - 현재 사용자 식단 리스트 + 오늘 섭취 칼로리
router.get('/', async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/');

    const rows = await FoodLog.findAll({
      where: { userId: req.session.userId },
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    const foods = rows.map((row) => {
      let imagePaths = [];
      if (row.image_path) {
        try {
          imagePaths = JSON.parse(row.image_path);
        } catch (e) {
          imagePaths = [row.image_path];
        }
      }

      const d =
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : row.date;

      return {
        id: row.id.toString(),
        user: req.session.user,
        meal_type: row.food_name,  // 지금은 food_name을 그대로 사용
        calorie: row.calorie,
        imagePaths,
        date: d,    // 문자열 YYYY-MM-DD
      };
    });

    // "오늘" 문자열
    const today = todayStr();   // ex) "2025-12-05"

    // 오늘 섭취 칼로리만 합산
    const todayCalorie = foods
      .filter(f => f.date === today)
      .reduce(
        (sum, f) => sum + (Number(f.calorie) || 0),
        0
      );

    res.render('food', {
      title: '식단 등록',
      session: req.session,
      foods,
      todayCalorie,  // 오늘 섭취 칼로리
    });
  } catch (err) {
    next(err);
  }
});

// POST /food — 여러 파일 업로드 + 칼로리 입력
router.post('/', upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/');

    const { food_name, meal_type, calorie, date } = req.body;
    const imagePaths =
      req.files?.map((f) => `/uploads/${f.filename}`) || [];

    // 식단 이름이 있으면 우선, 없으면 식사 종류, 둘 다 없으면 '식단'
    const name = food_name || meal_type || '식단';

    await FoodLog.create({
      userId: req.session.userId,
      food_name: name,                            // 화면에서 meal_type으로 사용
      calorie: calorie ? parseFloat(calorie) : 0, // 숫자로 저장
      image_path: JSON.stringify(imagePaths),
      date: date || todayStr(),
    });

    // 식단 등록 후 오늘 칼로리 재계산 (health 페이지용)
    if (typeof healthRouter.recalcTodayCalorieForUser === 'function') {
      await healthRouter.recalcTodayCalorieForUser(req.session.userId);
    }

    res.redirect('/food');
  } catch (err) {
    next(err);
  }
});

// PUT /food/:id — 식단 수정
router.put('/:id', upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { food_name, meal_type, calorie, date } = req.body;

    const record = await FoodLog.findOne({
      where: { id, userId: req.session.userId },
    });

    if (!record)
      return res.status(404).json({ error: 'Record not found' });

    let imagePaths;
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map((f) => `/uploads/${f.filename}`);
    } else if (record.image_path) {
      try {
        imagePaths = JSON.parse(record.image_path);
      } catch (e) {
        imagePaths = [record.image_path];
      }
    } else {
      imagePaths = [];
    }

    // 수정 시에도 food_name 또는 meal_type 중 들어오는 값으로 이름 갱신
    record.food_name = food_name || meal_type || record.food_name;
    if (calorie !== undefined) {
      record.calorie = calorie ? parseFloat(calorie) : 0;
    }
    if (date) {
      record.date = date;
    }
    record.image_path = JSON.stringify(imagePaths);

    await record.save();

    const resp = {
      id: record.id.toString(),
      user: req.session.user,
      meal_type: record.food_name,
      calorie: record.calorie,
      imagePaths,
      date: record.date,
    };

    // 식단 수정 후 오늘 칼로리 재계산
    if (typeof healthRouter.recalcTodayCalorieForUser === 'function') {
      await healthRouter.recalcTodayCalorieForUser(req.session.userId);
    }

    res.json({ success: true, record: resp });
  } catch (err) {
    next(err);
  }
});

// DELETE /food/:id — 식단 삭제
router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const deleted = await FoodLog.destroy({
      where: { id, userId: req.session.userId },
    });

    if (!deleted)
      return res.status(404).json({ error: 'Record not found' });

    // 식단 삭제 후 오늘 칼로리 재계산
    if (typeof healthRouter.recalcTodayCalorieForUser === 'function') {
      await healthRouter.recalcTodayCalorieForUser(req.session.userId);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
