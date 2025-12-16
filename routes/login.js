// 고급웹프로그래밍 기말프로젝트 이성은 60212770

const express = require('express');
const router = express.Router();
const { User } = require('../models');

// 로그인 페이지
router.get('/', (req, res) => {
  res.render('login', { title: 'Login', session: req.session });
});

// 로그인 처리
router.post('/admit', async (req, res, next) => {
  try {
    const { login, password } = req.body;

    const user = await User.findOne({
      where: { loginId: login, password }
    });

    if (user) {
      // 기존 session.user 유지 + 숫자 PK도 함께 저장
      req.session.user = user.loginId; // 기존 코드 호환용
      req.session.userId = user.id;    // DB 연동용
      return res.redirect('/welcome');
    } else {
      return res.send(
        "<script>alert('로그인 실패: 아이디 또는 비밀번호가 올바르지 않습니다.'); location.href='/'</script>"
      );
    }
  } catch (err) {
    next(err);
  }
});

// 환영 페이지
router.get('/welcome', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('welcome', { title: '환영합니다', session: req.session });
});

// 회원가입 페이지
router.get('/register', (req, res) => {
  res.render('register', { title: '회원가입', session: req.session });
});

// 회원가입 처리
router.post('/register', async (req, res, next) => {
  try {
    const { id, password, age, gender, weight, height } = req.body;

    const exUser = await User.findOne({
      where: { loginId: id },
    });

    if (exUser) {
      return res.send(
        "<script>alert('이미 존재하는 아이디입니다.'); location.href='/register'</script>"
      );
    }

    await User.create({
      loginId: id,
      password,
      age: age ? parseInt(age, 10) : null,
      gender: gender || null,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
    });

    return res.send(
      "<script>alert('회원가입 완료! 로그인 해주세요.'); location.href='/'</script>"
    );
  } catch (err) {
    next(err);
  }
});


// 회원 정보 수정 페이지
router.get('/user/profile', async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/');

    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect('/');

    // profile.ejs 에서 user 정보 보여주고 수정 폼 작성 예정
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
    if (!req.session.userId) return res.redirect('/');

    const { password, age, gender, weight, height } = req.body;

    const updateData = {};
    if (password) updateData.password = password;
    if (age !== undefined) updateData.age = age ? parseInt(age, 10) : null;
    if (gender !== undefined && gender !== '') updateData.gender = gender;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (height !== undefined) updateData.height = height ? parseFloat(height) : null;

    await User.update(updateData, {
      where: { id: req.session.userId },
    });

    return res.send(
      "<script>alert('회원 정보가 수정되었습니다.'); location.href='/welcome'</script>"
    );
  } catch (err) {
    next(err);
  }
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
