import { Sequelize, DataTypes } from "sequelize";
import { getDatabasePath } from "./sqlite.js";

export function createSequelize(storage = getDatabasePath()): Sequelize {
  return new Sequelize("sqlite://", { dialect: "sqlite", storage, logging: false });
}

export function defineOperationalModels(sequelize: Sequelize) {
  const Service = sequelize.define("Service", { id: { type: DataTypes.STRING, primaryKey: true }, name: { type: DataTypes.STRING, allowNull: false } });
  const Alert = sequelize.define("Alert", { id: { type: DataTypes.STRING, primaryKey: true }, serviceId: { type: DataTypes.STRING, allowNull: false }, status: { type: DataTypes.STRING, allowNull: false } });
  const Incident = sequelize.define("Incident", { id: { type: DataTypes.STRING, primaryKey: true }, serviceId: { type: DataTypes.STRING, allowNull: false }, status: { type: DataTypes.STRING, allowNull: false } });
  const Message = sequelize.define("messages", {
    id: { type: DataTypes.STRING, primaryKey: true },
    conversationId: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.STRING, allowNull: false },
  });
  const Memory = sequelize.define("memories", {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false, field: "user_id" },
    fact: { type: DataTypes.TEXT, allowNull: false },
    embedding: { type: DataTypes.BLOB, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
  });
  return { Service, Alert, Incident, Message, Memory };
}
