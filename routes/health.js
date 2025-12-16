// routes/health.js
// 고급웹프로그래밍 기말프로젝트 이성은 60212770

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const {
  Health,
  Health_comment,
  User,
  FoodLog,
  User_Calorie_Log,
  Health_Exercise,
  Exercise,
} = require('../models');

// -------- 공통 헬퍼 --------
function todayStr() {
  const now = new Date(); // 로컬 시간 기준
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return {
    start: new Date(y, m, d, 0, 0, 0),
    end: new Date(y, m, d + 1, 0, 0, 0),
  };
}

// BMR (Mifflin-St Jeor)
function calcBmr(user) {
  if (
    !user ||
    user.age == null ||
    user.gender == null ||
    user.weight == null ||
    user.height == null
  ) {
    return null;
  }
  const w = Number(user.weight);
  const h = Number(user.height);
  const a = Number(user.age);
  if (Number.isNaN(w) || Number.isNaN(h) || Number.isNaN(a)) return null;

  if (user.gender === 'M' || user.gender === '남') {
    return 10 * w + 6.25 * h - 5 * a + 5;
  }
  if (user.gender === 'F' || user.gender === '여') {
    return 10 * w + 6.25 * h - 5 * a - 161;
  }
  return null;
}

// MET 기반 운동 칼로리
// kcal = MET * 3.5 * 체중(kg) / 200 * 시간(분)
function calcExerciseCalorie(mets, weightKg, minutes) {
  if (!mets || !weightKg || !minutes) return 0;
  return (mets * 3.5 * weightKg * minutes) / 200;
}

// duration → 분
const DURATION_TO_MINUTES = {
  '30분 이하': 30,
  '30분 ~ 1시간': 45,
  '1시간 ~ 1시간 30분': 75,
  '1시간 30분 이상': 90,
};

// 분 → duration 문자열 (수정/표시에 사용)
function minutesToDurationLabel(minutes) {
  const m = Number(minutes) || 0;
  if (!m) return '';
  if (m <= 30) return '30분 이하';
  if (m <= 60) return '30분 ~ 1시간';
  if (m <= 90) return '1시간 ~ 1시간 30분';
  return '1시간 30분 이상';
}

// 오늘 칼로리 재계산 (운동 + 섭취칼로리 모두 반영)
async function recalcTodayCalorieForUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const bmr = calcBmr(user);
  if (!bmr) return null;

  const now = new Date();
  const today = todayStr();
  const minutesToday = now.getHours() * 60 + now.getMinutes();

  const baseBurned = (bmr / (24 * 60)) * minutesToday;
  const { start, end } = todayRange();

  // 오늘 운동 칼로리
  const todayExercises = await Health_Exercise.findAll({
    include: [
      {
        model: Health,
        where: {
          userId,
          createdAt: { [Op.gte]: start, [Op.lt]: end },
        },
        attributes: [],
      },
    ],
  });

  const exerciseBurned = todayExercises.reduce(
    (sum, he) => sum + (Number(he.calculated_calorie) || 0),
    0
  );

  // 오늘 섭취 칼로리
  let intake = 0;
  if (FoodLog) {
    const foods = await FoodLog.findAll({
      where: { userId, date: today },
    });
    intake = foods.reduce(
      (sum, f) => sum + (Number(f.calorie) || 0),
      0
    );
  }

  const burned = baseBurned + exerciseBurned;
  const net = Math.max(0, burned - intake);

  // User_Calorie_Log 에 오늘 값 저장
  if (User_Calorie_Log) {
    const [log, created] = await User_Calorie_Log.findOrCreate({
      where: { userId, date: today },
      defaults: { used_calorie: net },
    });
    if (!created) {
      log.used_calorie = net;
      await log.save();
    }
  }

  return {
    bmr: Math.round(bmr),
    baseBurned: Math.round(baseBurned),
    exerciseBurned: Math.round(exerciseBurned),
    burned: Math.round(burned),
    intake: Math.round(intake),
    net: Math.round(net),
    date: today,
  };
}

// 다른 라우터에서도 쓸 수 있도록 router에 붙여둠
router.recalcTodayCalorieForUser = recalcTodayCalorieForUser;

// -------- 오늘 칼로리 계산 (리셋 없음) --------
router.get('/calorie', async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const result = await recalcTodayCalorieForUser(req.session.userId);

    if (!result) {
      return res.json({
        bmr: null,
        message: '나이/성별/체중/신장을 먼저 입력해주세요.',
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// -------- 운동 기록 메인 페이지 --------
router.get('/', async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/');

    const exercises = await Exercise.findAll({
      order: [['exercise_name', 'ASC']],
    });

    const healthRows = await Health.findAll({
      where: { userId: req.session.userId },
      include: [
        {
          model: Health_Exercise,
          include: [Exercise],
        },
        {
          model: Health_comment,
          include: [User],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // 화면에서 쓰기 편한 records 형태로 변환
    const records = healthRows.map((h) => {
      const exerciseItems = (h.Health_Exercises || []).map((he) => {
        const minutes = he.duration || (DURATION_TO_MINUTES[he.duration] || 0);
        return {
          name: he.Exercise ? he.Exercise.exercise_name : h.exercise_type,
          minutes,
          durationLabel: minutesToDurationLabel(minutes),
          calorie: he.calculated_calorie || 0,
          exerciseId: he.exerciseId,
        };
      });

      const totalExerciseCalorie = exerciseItems.reduce(
        (sum, item) => sum + (Number(item.calorie) || 0),
        0
      );

      const comments = (h.Health_comments || []).map((c) => ({
        id: c.id,
        user: c.User ? c.User.loginId : '',
        comment: c.comment,
        date: c.createdAt.toLocaleString(),
      }));

      return {
        id: h.id,
        date: h.createdAt.toISOString().slice(0, 10),
        exercise_type: h.exercise_type,
        details: h.details,
        duration: h.duration,
        exerciseItems,
        totalExerciseCalorie,
        comments,
      };
    });

    const totalExerciseCalorieAll = records.reduce(
      (sum, r) => sum + (Number(r.totalExerciseCalorie) || 0),
      0
    );

    res.render('health', {
      title: '운동 기록',
      session: req.session,
      exercises,
      records,
      totalExerciseCalorie: totalExerciseCalorieAll,
    });
  } catch (err) {
    next(err);
  }
});

// -------- 운동 기록 등록 (여러 운동 한 번에 + 단일 등록도 지원) --------
router.post('/', async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/');

    // 여러 운동 폼: exerciseIds, durations
    // 단일 폼: exerciseId, duration
    let { exerciseIds, durations, exerciseId, duration, details } = req.body;

    // exerciseIds / durations 가 단일 값이면 배열로 통일
    if (!Array.isArray(exerciseIds)) {
      if (exerciseIds) exerciseIds = [exerciseIds];
      else exerciseIds = [];
    }
    if (!Array.isArray(durations)) {
      if (durations) durations = [durations];
      else durations = [];
    }

    // 유효한 쌍만 남기기 (여러 운동용)
    const pairs = [];
    for (let i = 0; i < exerciseIds.length; i++) {
      const exId = exerciseIds[i];
      const durLabel = durations[i] || durations[0]; // 혹시 길이가 안 맞을 때 대비
      if (!exId || !durLabel) continue;
      pairs.push({ exId, durLabel });
    }

    // 여러 운동이 없고, 단일 폼(exerciseId, duration)만 온 경우 처리
    if (pairs.length === 0 && exerciseId && duration) {
      pairs.push({ exId: exerciseId, durLabel: duration });
    }

    if (pairs.length === 0) {
      // 운동이 하나도 선택되지 않은 경우
      return res.status(400).send('운동을 한 개 이상 선택해주세요.');
    }

    const user = await User.findByPk(req.session.userId);

    // 우선 Health 레코드 생성 (요약 값은 나중에 세팅)
    const health = await Health.create({
      userId: req.session.userId,
      exercise_type: '',
      details,
      duration: '',
    });

    const exerciseNames = [];
    let totalCalorie = 0;

    for (const { exId, durLabel } of pairs) {
      const exercise = await Exercise.findByPk(exId);
      if (!exercise) continue;

      const minutes = DURATION_TO_MINUTES[durLabel] || 0;
      if (!user || !user.weight || minutes <= 0) continue;

      const calorie = calcExerciseCalorie(exercise.mets, user.weight, minutes);
      totalCalorie += calorie;

      await Health_Exercise.create({
        healthId: health.id,
        exerciseId: exercise.id,
        duration: minutes,
        calculated_calorie: calorie,
      });

      exerciseNames.push(exercise.exercise_name);
    }

    // Health 요약 정보(운동 이름/시간) 갱신
    if (exerciseNames.length > 0) {
      health.exercise_type =
        exerciseNames.length === 1
          ? exerciseNames[0]
          : `${exerciseNames[0]} 외 ${exerciseNames.length - 1}개`;
      health.duration =
        pairs.length === 1 ? pairs[0].durLabel : '여러 운동';
      await health.save();
    }

    // 운동 기록 추가 후 오늘 칼로리 재계산
    await recalcTodayCalorieForUser(req.session.userId);

    res.redirect('/health');
  } catch (err) {
    next(err);
  }
});

// =======================
// 운동 기록 수정 (여러 운동 + 단일 수정 둘 다 지원)
// =======================
router.put('/:id', async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    let { exerciseIds, durations, exerciseId, duration, details } = req.body;

    const health = await Health.findOne({
      where: { id, userId: req.session.userId },
      include: [{ model: Health_Exercise }],
    });

    if (!health)
      return res.status(404).json({ error: 'Record not found' });

    // 배열 형태로 정규화(여러 운동용)
    if (!Array.isArray(exerciseIds)) {
      if (exerciseIds) exerciseIds = [exerciseIds];
      else exerciseIds = [];
    }
    if (!Array.isArray(durations)) {
      if (durations) durations = [durations];
      else durations = [];
    }

    const pairs = [];
    for (let i = 0; i < exerciseIds.length; i++) {
      const exId = exerciseIds[i];
      const durLabel = durations[i] || durations[0];
      if (!exId || !durLabel) continue;
      pairs.push({ exId, durLabel });
    }

    // 🔹 모달에서 단일 값(exerciseId, duration)만 넘어오는 경우 처리
    if (pairs.length === 0 && exerciseId && duration) {
      pairs.push({ exId: exerciseId, durLabel: duration });
    }

    if (pairs.length === 0) {
      return res
        .status(400)
        .json({ error: '운동을 한 개 이상 선택해주세요.' });
    }

    const user = await User.findByPk(req.session.userId);

    // Health 기본 정보 업데이트 (세부 사항)
    if (typeof details === 'string') {
      health.details = details;
    }

    // 기존 Health_Exercise 모두 삭제 후 다시 생성
    await Health_Exercise.destroy({ where: { healthId: health.id } });

    const exerciseNames = [];
    let totalCalorie = 0;

    for (const { exId, durLabel } of pairs) {
      const exercise = await Exercise.findByPk(exId);
      if (!exercise) continue;

      const minutes = DURATION_TO_MINUTES[durLabel] || 0;
      if (!user || !user.weight || minutes <= 0) continue;

      const calorie = calcExerciseCalorie(exercise.mets, user.weight, minutes);
      totalCalorie += calorie;

      await Health_Exercise.create({
        healthId: health.id,
        exerciseId: exercise.id,
        duration: minutes,
        calculated_calorie: calorie,
      });

      exerciseNames.push(exercise.exercise_name);
    }

    // Health 요약 정보 갱신
    if (exerciseNames.length > 0) {
      health.exercise_type =
        exerciseNames.length === 1
          ? exerciseNames[0]
          : `${exerciseNames[0]} 외 ${exerciseNames.length - 1}개`;
      health.duration =
        pairs.length === 1 ? pairs[0].durLabel : '여러 운동';
    } else {
      health.exercise_type = '';
      health.duration = '';
    }

    await health.save();

    // 수정 후 오늘 칼로리 재계산
    await recalcTodayCalorieForUser(req.session.userId);

    res.json({
      success: true,
      id: health.id,
      exercise_type: health.exercise_type,
      duration: health.duration,
      details: health.details,
      totalExerciseCalorie: totalCalorie,
    });
  } catch (err) {
    next(err);
  }
});

// =======================
// 운동 기록 삭제
// =======================
router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const deleted = await Health.destroy({
      where: { id, userId: req.session.userId },
    });

    if (!deleted)
      return res.status(404).json({ error: 'Record not found' });

    // onDelete: 'CASCADE' 를 migration에서 제대로 걸어놨다면
    // 연결된 Health_Exercise, Health_comment 등은 자동 삭제

    // 삭제 후 오늘 칼로리 재계산
    await recalcTodayCalorieForUser(req.session.userId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// =======================
// 댓글 등록
// =======================
router.post('/:id/comments', async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/');
    const { id } = req.params;
    const { comment } = req.body;

    await Health_comment.create({
      healthId: id,
      userId: req.session.userId,
      comment,
    });

    res.redirect('/health');
  } catch (err) {
    next(err);
  }
});

// =======================
// 댓글 수정
// =======================
router.put('/:healthId/comments/:commentId', async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const { healthId, commentId } = req.params;
    const { comment } = req.body;

    const [updated] = await Health_comment.update(
      { comment },
      { where: { id: commentId, healthId, userId: req.session.userId } }
    );

    if (!updated)
      return res.status(404).json({ error: 'Comment not found' });

    const updatedComment = await Health_comment.findByPk(commentId);
    res.json({
      success: true,
      comment: updatedComment.comment,
      date: updatedComment.updatedAt.toLocaleString(),
    });
  } catch (err) {
    next(err);
  }
});

// =======================
// 댓글 삭제
// =======================
router.delete('/:healthId/comments/:commentId', async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const { healthId, commentId } = req.params;

    const deleted = await Health_comment.destroy({
      where: { id: commentId, healthId, userId: req.session.userId },
    });

    if (!deleted)
      return res.status(404).json({ error: 'Comment not found' });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
