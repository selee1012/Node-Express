// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// models/Exercise.js

'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Exercise extends Model {
    static associate(db) {
      // Exercise - Health (N:M) : Health_Exercise 중간 테이블
      db.Exercise.belongsToMany(db.Health, {
        through: db.Health_Exercise,
        foreignKey: 'exerciseId',
        otherKey: 'healthId',
      });

      db.Exercise.hasMany(db.Health_Exercise, {
        foreignKey: 'exerciseId',
        sourceKey: 'id',
        onDelete: 'CASCADE',
      });
    }
  }

  // mets를 활용해 운동 및 시간에 따른 칼로리 계산
  Exercise.init(
    {
      exercise_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      mets: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Exercise',
      tableName: 'Exercise',
      timestamps: true,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    }
  );

  return Exercise;
};
