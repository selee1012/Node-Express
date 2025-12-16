// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// models/FoodLog.js
'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FoodLog extends Model {
    // 1:N 관계
    static associate(db) {
      if (db.User) {
        db.FoodLog.belongsTo(db.User, {
          foreignKey: 'userId',
          targetKey: 'id',
        });
      }
    }
  }

  FoodLog.init(
    {
      food_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      calorie: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      image_path: {
        // 여러 이미지를 JSON 문자열로 저장 (["/uploads/...","..."])
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date: {
        // YYYY-MM-DD 형태의 날짜
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'FoodLog',
      tableName: 'FoodLog',
      timestamps: true,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    }
  );

  return FoodLog;
};
