// 고급웹프로그래밍 기말프로젝트 이성은 60212770
'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// models 폴더 전체에서 model 로딩
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// 각 모델의 associate 호출
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Exercise 초기 데이터 자동 삽입 함수
async function initExercises() {
  // Exercise 모델이 아직 없으면(마이그레이션 전) 그냥 무시
  if (!db.Exercise) {
    console.log('Exercise 모델이 없어 seed를 건너뜁니다.');
    return;
  }

  try {
    const count = await db.Exercise.count();
    if (count === 0) {
      await db.Exercise.bulkCreate([
        { exercise_name: '걷기(천천히)',       mets: 2.8 },
        { exercise_name: '걷기(빠르게)',       mets: 3.5 },
        { exercise_name: '조깅',               mets: 7.0 },
        { exercise_name: '자전거(보통 속도)',  mets: 6.8 },
        { exercise_name: '근력 운동(보통 강도)', mets: 3.5 },
      ]);
      console.log('Exercise 초기 데이터 생성 완료');
    } else {
      console.log(`Exercise 데이터 이미 ${count}개 존재. seed 생략.`);
    }
  } catch (err) {
    console.error('Exercise 초기 데이터 생성 중 오류:', err);
  }
}

// 나중에 app.js에서 호출할 수 있게 export
db.initExercises = initExercises;

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
