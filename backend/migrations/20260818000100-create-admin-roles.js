'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      is_system: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      permissions: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Un seul rôle système peut exister : il détient toutes les permissions par
    // calcul (adminPermissions.js) et reste le seul à pouvoir définir les autres.
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX admin_roles_single_system_idx ON admin_roles (is_system) WHERE is_system = true'
    );

    await queryInterface.sequelize.query(`
      INSERT INTO admin_roles (id, name, is_system, permissions, created_at, updated_at)
      VALUES (gen_random_uuid(), 'super_admin', true, '{}'::jsonb, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_roles');
  },
};
