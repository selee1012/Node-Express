// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// models/User_Calorie_Log.js
'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User_Calorie_Log extends Model {
    static associate(db) {
      if (db.User) {
        db.User_Calorie_Log.belongsTo(db.User, {
          foreignKey: 'userId',
          targetKey: 'id',
        });
      }
    }
  }

  User_Calorie_Log.init(
    {
      date: {
        // 해당 기록이 의미하는 날짜 (reset 누른 날짜 or 일별 기록 날짜)
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      used_calorie: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'User_Calorie_Log',
      tableName: 'User_Calorie_Log',
      timestamps: true,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    }
  );

  return User_Calorie_Log;
};
