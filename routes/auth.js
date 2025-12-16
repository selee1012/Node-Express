// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// routes/auth.js - 로컬 / 카카오 / 네이버 로그인 + 회원가입 + 환영 페이지 + 회원 정보 수정 + 로그아웃

const express = require('express');
const passport = require('passport');
const { User } = require('../models');

const router = express.Router();

// 로그인 페이지
router.get('/', (req, res) => {
  // 이미 로그인 상태면 바로 환영 페이지로
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/welcome');
  }
  res.render('login', { title: 'Login', session: req.session });
});

// 로컬 로그인 처리
router.post('/admit', (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) return next(authError);
    if (!user) {
      const msg =
        (info && info.message) || '아이디 또는 비밀번호가 일치하지 않습니다.';
      return res.send(
        `<script>alert('${msg}'); location.href='/'</script>`
      );
    }

    return req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      return res.redirect('/welcome');
    });
  })(req, res, next);
});

// 회원가입 페이지 (local 용)
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register', session: req.session });
});

// 회원가입 처리 (local 전용)
router.post('/register', async (req, res, next) => {
  try {
    const { id, password, age, gender, weight, height } = req.body;

    const exUser = await User.findOne({
      where: { loginId: id, provider: 'local' },
    });
    if (exUser) {
      return res.send(
        "<script>alert('이미 존재하는 아이디입니다.'); history.back();</script>"
      );
    }

    await User.create({
      loginId: id,
      password,
      age: age ? parseInt(age, 10) : null,
      gender,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      provider: 'local',
    });

    return res.send(
      "<script>alert('회원가입 완료! 로그인 해주세요.'); location.href='/'</script>"
    );
  } catch (err) {
    next(err);
  }
});

// 🔸 프로필 정보(나이/성별/체중/신장) 입력 여부 체크
function isProfileFilled(user) {
  return (
    user &&
    user.age != null &&
    user.gender != null &&
    user.weight != null &&
    user.height != null
  );
}

// 환영 페이지
router.get('/welcome', async (req, res, next) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect('/');
    }

    const userId = req.user ? req.user.id : req.session.userId;
    if (!userId) return res.redirect('/');

    const user = await User.findByPk(userId);
    if (!user) return res.redirect('/');

    // ✅ local 은 회원가입 때 이미 다 받았다고 가정 → 프로필 강제 X
    // ✅ kakao / naver 만 프로필 필수
    if (user.provider !== 'local' && !isProfileFilled(user)) {
      return res.send(
        "<script>alert('처음 소셜 로그인 하셨습니다. 기초대사량 계산을 위해 나이/성별/체중/신장을 먼저 입력해주세요.'); location.href='/user/profile';</script>"
      );
    }

    res.render('welcome', { title: 'Welcome', session: req.session });
  } catch (err) {
    next(err);
  }
});

// 회원 정보 수정 페이지 (주로 카카오/네이버용, 원하면 local도 사용 가능)
router.get('/user/profile', async (req, res, next) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect('/');
    }

    const userId = req.user ? req.user.id : req.session.userId;
    if (!userId) return res.redirect('/');

    const user = await User.findByPk(userId);
    if (!user) return res.redirect('/');

    res.render('profile', {
      title: '회원 정보 수정',
      session: req.session,
      user,
    });
  } catch (err) {
    next(err);
  }
});

// 회원 정보 수정 처리
router.post('/user/profile', async (req, res, next) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.redirect('/');
    }

    const userId = req.user ? req.user.id : req.session.userId;
    if (!userId) return res.redirect('/');

    const { password, age, gender, weight, height } = req.body;

    const updateData = {};
    // (원하면 local 사용자도 비밀번호 변경 가능)
    if (password) updateData.password = password;
    if (age !== undefined) updateData.age = age ? parseInt(age, 10) : null;
    if (gender !== undefined && gender !== '') updateData.gender = gender;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (height !== undefined) updateData.height = height ? parseFloat(height) : null;

    await User.update(updateData, {
      where: { id: userId },
    });

    return res.send(
      "<script>alert('회원 정보가 수정되었습니다.'); location.href='/welcome'</script>"
    );
  } catch (err) {
    next(err);
  }
});

// 로그아웃
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/'));
  });
});

// ===== 카카오 로그인 =====
router.get('/auth/kakao', passport.authenticate('kakao'));

router.get(
  '/auth/kakao/callback',
  passport.authenticate('kakao', {
    failureRedirect: '/',
  }),
  (req, res) => {
    // 로그인 성공 시
    res.redirect('/welcome');
  }
);

// ===== 네이버 로그인 =====
router.get('/auth/naver', passport.authenticate('naver'));

router.get(
  '/auth/naver/callback',
  passport.authenticate('naver', {
    failureRedirect: '/',
  }),
  (req, res) => {
    // 로그인 성공 시
    res.redirect('/welcome');
  }
);

module.exports = router;
