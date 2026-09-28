declare module "sequelize" {
  export class Sequelize {
    constructor(databaseUrl: string, options?: { dialect?: string; storage?: string; logging?: boolean });
    define(name: string, attributes: Record<string, unknown>): unknown;
  }
  export const DataTypes: {
    STRING: unknown;
    TEXT: unknown;
    BLOB: unknown;
    DATE: unknown;
  };
}
