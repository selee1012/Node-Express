// 고급웹프로그래밍 기말프로젝트 이성은 60212770
'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(db) {
      // 1:N : User - Health
      if (db.Health) {
        db.User.hasMany(db.Health, {
          foreignKey: 'userId',
          sourceKey: 'id',
        });
      }

      // 1:N : User - Health_comment
      if (db.Health_comment) {
        db.User.hasMany(db.Health_comment, {
          foreignKey: 'userId',
          sourceKey: 'id',
        });
      }

      // 1:N : User - FoodLog
      if (db.FoodLog) {
        db.User.hasMany(db.FoodLog, {
          foreignKey: 'userId',
          sourceKey: 'id',
        });
      }

      // 1:N : User - User_Calorie_Log
      if (db.User_Calorie_Log) {
        db.User.hasMany(db.User_Calorie_Log, {
          foreignKey: 'userId',
          sourceKey: 'id',
        });
      }
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      // 로그인 아이디 (local + 소셜 공통)
      loginId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      // 비밀번호 (local 전용, 소셜은 null)
      password: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      age: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      gender: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      weight: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      height: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      // 소셜로그인 구분용
      provider: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'local', // local, kakao, naver
      },
      // 소셜 서비스에서 받은 고유 ID
      snsId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true,
      underscored: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    }
  );

  return User;
};
