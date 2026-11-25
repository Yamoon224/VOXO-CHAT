'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

    await queryInterface.createTable('knowledge_chunks', {
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
      knowledge_base_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'KnowledgeBase',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      chunk_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      content_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      embedding: {
        type: 'vector(1536)',
        allowNull: true,
      },
      embedding_model: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      embedding_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      embedding_error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
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

    await queryInterface.addIndex('knowledge_chunks', ['tenant_id'], {
      name: 'knowledge_chunks_tenant_id_idx',
    });
    await queryInterface.addIndex('knowledge_chunks', ['knowledge_base_id'], {
      name: 'knowledge_chunks_knowledge_base_id_idx',
    });
    await queryInterface.addIndex('knowledge_chunks', ['embedding_status'], {
      name: 'knowledge_chunks_embedding_status_idx',
    });
    await queryInterface.addIndex('knowledge_chunks', ['knowledge_base_id', 'content_hash'], {
      name: 'knowledge_chunks_document_hash_idx',
    });

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        CREATE INDEX knowledge_chunks_embedding_hnsw_idx
        ON knowledge_chunks
        USING hnsw (embedding vector_cosine_ops)
        WHERE embedding IS NOT NULL;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping HNSW index for knowledge_chunks.embedding: %', SQLERRM;
      END
      $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('knowledge_chunks');
  },
};
