// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// 네이버 로그인 구현
// passport/naverStrategy.js
const NaverStrategy = require('passport-naver-v2').Strategy;
const { User } = require('../models');

module.exports = (passport) => {
  passport.use(
    new NaverStrategy(
      {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: '/auth/naver/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const snsId = String(profile.id);
          const provider = 'naver';

          let user = await User.findOne({
            where: { snsId, provider },
          });

          if (!user) {
            const email = profile.email;
            const nickname = profile.nickname;

            const loginId =
              (email && `naver-${email}`) ||
              (nickname && `naver-${nickname}`) ||
              `naver-${snsId}`;

            user = await User.create({
              loginId,
              password: null,
              provider,
              snsId,
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
