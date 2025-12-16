// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// passport/index.js
const { User } = require('../models');
const local = require('./localStrategy');
const kakao = require('./kakaoStrategy');
const naver = require('./naverStrategy');

module.exports = (passport) => {
  // 세션에 어떤 정보를 저장할지
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // 세션에서 user.id 값을 다시 유저 객체로 복원
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // 각 전략 등록
  local(passport);
  kakao(passport);
  naver(passport);
};
