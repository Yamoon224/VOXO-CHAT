'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('crawl_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tenant',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      root_url: {
        type: Sequelize.STRING(2048),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      strategy: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      discovered_via: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      pages_discovered: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pages_indexed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pages_failed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failure_reason: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      failure_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      errors: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      options: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('crawl_jobs', ['tenant_id'], {
      name: 'crawl_jobs_tenant_id_idx',
    });
    await queryInterface.addIndex('crawl_jobs', ['status'], {
      name: 'crawl_jobs_status_idx',
    });

    // Rattacher chaque connaissance au crawl qui l'a produite
    await queryInterface.addColumn('KnowledgeBase', 'crawl_job_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'crawl_jobs',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('KnowledgeBase', ['crawl_job_id'], {
      name: 'knowledge_base_crawl_job_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('KnowledgeBase', 'knowledge_base_crawl_job_id_idx');
    await queryInterface.removeColumn('KnowledgeBase', 'crawl_job_id');
    await queryInterface.dropTable('crawl_jobs');
  },
};
