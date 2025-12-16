// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// models/Health_Exercise.js

'use strict';

const { Model } = require('sequelize');

// health table과 exercise를 이어주는 relational table
// health, exercise와 각각은 1:N
// health와 exercise는 M:N
module.exports = (sequelize, DataTypes) => {
  class Health_Exercise extends Model {
    static associate(db) {
      if (db.Health) {
        db.Health_Exercise.belongsTo(db.Health, {
          foreignKey: 'healthId',
          targetKey: 'id',
        });
      }
      if (db.Exercise) {
        db.Health_Exercise.belongsTo(db.Exercise, {
          foreignKey: 'exerciseId',
          targetKey: 'id',
        });
      }
    }
  }

  Health_Exercise.init(
    {
      // 이 기록에서 실제 운동한 시간(분)
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // 해당 운동으로 소모된 칼로리(kcal)
      calculated_calorie: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Health_Exercise',
      tableName: 'Health_Exercise',
      timestamps: true,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    }
  );

  return Health_Exercise;
};
