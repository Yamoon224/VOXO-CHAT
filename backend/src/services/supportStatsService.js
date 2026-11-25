const { sequelize } = require('../models');

const int = value => Number.parseInt(value, 10) || 0;
const select = (sql, replacements) => sequelize.query(sql, {
  replacements, type: sequelize.QueryTypes.SELECT,
});

class SupportStatsService {
  async getDashboard({ from, to }) {
    const replacements = { from, to };
    const [totals, timing, byAdmin, byReason] = await Promise.all([
      select(`SELECT COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) FILTER (WHERE status='resolved') AS resolved, COUNT(*) FILTER (WHERE assigned_admin_id IS NULL AND status IN ('open','pending')) AS unassigned, COUNT(*) FILTER (WHERE priority='high' AND status IN ('open','pending')) AS high_priority FROM support_tickets WHERE created_at >= :from AND created_at < :to`, replacements),
      select(`SELECT AVG(EXTRACT(EPOCH FROM (first_reply.created_at - t.created_at))) FILTER (WHERE first_reply.created_at IS NOT NULL) AS first_reply_seconds, AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))) FILTER (WHERE t.resolved_at IS NOT NULL) AS resolution_seconds FROM support_tickets t LEFT JOIN LATERAL (SELECT created_at FROM support_messages m WHERE m.ticket_id=t.id AND m.author_type='admin' AND m.role='message' ORDER BY created_at LIMIT 1) first_reply ON true WHERE t.created_at >= :from AND t.created_at < :to`, replacements),
      select(`SELECT COALESCE(CONCAT(a.first_name, ' ', a.last_name), 'Non attribué') AS name, COUNT(*) AS tickets, COUNT(*) FILTER (WHERE t.status='resolved') AS resolved FROM support_tickets t LEFT JOIN admin_users a ON a.id=t.assigned_admin_id WHERE t.created_at >= :from AND t.created_at < :to GROUP BY 1 ORDER BY tickets DESC`, replacements),
      select(`SELECT reason, COUNT(*) AS tickets FROM support_tickets WHERE created_at >= :from AND created_at < :to GROUP BY reason ORDER BY tickets DESC`, replacements),
    ]);
    return {
      open: int(totals[0].open), pending: int(totals[0].pending), resolved: int(totals[0].resolved),
      unassigned: int(totals[0].unassigned), highPriority: int(totals[0].high_priority),
      avgFirstReplySeconds: timing[0].first_reply_seconds ? Math.round(Number(timing[0].first_reply_seconds)) : null,
      avgResolutionSeconds: timing[0].resolution_seconds ? Math.round(Number(timing[0].resolution_seconds)) : null,
      byAdmin: byAdmin.map(row => ({ name: row.name, tickets: int(row.tickets), resolved: int(row.resolved) })),
      byReason: byReason.map(row => ({ reason: row.reason, tickets: int(row.tickets) })),
    };
  }
}

module.exports = new SupportStatsService();
