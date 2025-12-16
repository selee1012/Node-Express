// 고급웹프로그래밍 기말프로젝트 이성은 60212770
// models/Health.js

'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Health extends Model {
    static associate(db) {
      // 글 작성자 (User 1 : N Health)
      db.Health.belongsTo(db.User, {
        foreignKey: 'userId',
        targetKey: 'id',
      });

      // 글 하나에 댓글 여러 개 (1:N)
      db.Health.hasMany(db.Health_comment, {
        foreignKey: 'healthId',
        sourceKey: 'id',
        onDelete: 'CASCADE',
      });

      // Health - Exercise (N:M) through Health_Exercise
      if (db.Exercise && db.Health_Exercise) {
        db.Health.belongsToMany(db.Exercise, {
          through: db.Health_Exercise,
          foreignKey: 'healthId',
          otherKey: 'exerciseId',
        });

        db.Health.hasMany(db.Health_Exercise, {
          foreignKey: 'healthId',
          sourceKey: 'id',
          onDelete: 'CASCADE',
        });
      }
    }
  }

  Health.init(
    {
      // 선택된 운동 이름(버튼에서 고른 이름)
      exercise_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration: {
        // 30분 이하 / 30분~1시간 ... 같은 문자열
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      // createdAt, updatedAt 자동 (timestamps: true)
    },
    {
      sequelize,
      modelName: 'Health',
      tableName: 'Health',
      timestamps: true,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    }
  );

  return Health;
};
