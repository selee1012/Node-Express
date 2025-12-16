// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// 사이트 자체 로그인 구현
// passport/localStrategy.js
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models');

module.exports = (passport) => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'login',    // login.ejs 의 name="login"
        passwordField: 'password', // name="password"
      },
      async (login, password, done) => {
        try {
          const user = await User.findOne({
            where: { loginId: login, provider: 'local' },
          });

          if (!user) {
            return done(null, false, {
              message: '존재하지 않는 아이디입니다.',
            });
          }

          // 과제용: 평문 비교 (실서비스에서는 bcrypt 사용 권장)
          if (user.password !== password) {
            return done(null, false, {
              message: '비밀번호가 일치하지 않습니다.',
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
};
