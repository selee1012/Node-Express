// 고급웹프로그래밍 기말프로젝트 이성은 60212770
'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Health_comment extends Model {
    static associate(db) {
      // 댓글 작성자 (M:1)
      db.Health_comment.belongsTo(db.User, {
        foreignKey: 'userId',
        targetKey: 'id'
      });

      // 어떤 Health 글에 달린 댓글인지 (M:1)
      db.Health_comment.belongsTo(db.Health, {
        foreignKey: 'healthId',
        targetKey: 'id'
      });
    }
  }

  Health_comment.init(
    {
      comment: {
        type: DataTypes.STRING(200),
        allowNull: false
      }
      // userId, healthId 는 관계 설정 시 자동 컬럼 생성
    },
    {
      sequelize,
      modelName: 'Health_comment',
      tableName: 'Health_comment', // 테이블 이름
      timestamps: true,
      charset: 'utf8',
      collate: 'utf8_general_ci'
    }
  );

  return Health_comment;
};
