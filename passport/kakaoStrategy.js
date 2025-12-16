// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// 카카오 로그인 구현
// passport/kakaoStrategy.js
const KakaoStrategy = require('passport-kakao').Strategy;
const { User } = require('../models');

module.exports = (passport) => {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID, // .env에 정의
        callbackURL: '/auth/kakao/callback',   // 카카오 개발자 콘솔에 등록한 redirect URI
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const snsId = String(profile.id);
          const provider = 'kakao';

          let user = await User.findOne({
            where: { snsId, provider },
          });

          if (!user) {
            // loginId는 적당히 유니크하게 붙여줌
            const baseName =
              profile.username ||
              (profile.displayName ? `kakao-${profile.displayName}` : null) ||
              `kakao-${snsId}`;

            user = await User.create({
              loginId: baseName,
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
