// 고급웹프로그래밍 기말프로젝트 이성은 60212770

require('dotenv').config(); // .env에서 KAKAO / NAVER 키 사용

// 미들웨어 및 모듈 가져오기
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

// models/index.js 전체 객체 불러오기
const db = require('./models');
const { sequelize } = db;

// passport 설정
const passportConfig = require('./passport');

// 라우터
const authRouter = require('./routes/auth');
const healthRouter = require('./routes/health');
const foodRouter = require('./routes/food');

const app = express();
app.set('port', 3000);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 미들웨어
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('webhw3-secret'));
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: 'webhw3-secret',
    cookie: {
      httpOnly: true,
      secure: false,
    },
  })
);

// passport 초기화
passportConfig(passport);
app.use(passport.initialize());
app.use(passport.session());

// passport의 req.user 를 기존 세션 기반 코드와 연결
app.use((req, res, next) => {
  if (req.user) {
    req.session.userId = req.user.id;
    req.session.user = req.user.loginId;
    req.session.provider = req.user.provider; // local / kakao / naver
  }
  next();
});

// 라우터 연결
app.use('/', authRouter);      // 로그인, 회원가입, 소셜 로그인, 프로필 등
app.use('/health', healthRouter);
app.use('/food', foodRouter);

// 404 처리
app.use((req, res, next) => {
  res.status(404).send('404 Not Found');
});

// 에러 처리
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('서버 에러');
});

// Exercise 초기 데이터 세팅 (METs, 운동명)
async function initExercises() {
  if (!db.Exercise) return; // 모델 없으면 그냥 패스

  const count = await db.Exercise.count();
  if (count === 0) {
    await db.Exercise.bulkCreate([
      { exercise_name: '걷기(천천히)', mets: 2.8 },
      { exercise_name: '걷기(빠르게)', mets: 3.5 },
      { exercise_name: '조깅', mets: 7.0 },
      { exercise_name: '자전거(보통 속도)', mets: 6.8 },
      { exercise_name: '근력 운동(보통 강도)', mets: 3.5 },
    ]);
    console.log('Exercise 초기 데이터 생성 완료');
  }
}

// squelize 사용
sequelize
  .sync({ force: true })
  .then(() => {
    console.log('데이터베이스 연결 성공');
    // 여기서 바로 초기 데이터 세팅
    return initExercises();
  })
  .then(() => {
    app.listen(app.get('port'), () => {
      console.log(app.get('port'), '번 포트에서 서버 실행 중');
    });
  })
  .catch((err) => {
    console.error(err);
  });

module.exports = app;
