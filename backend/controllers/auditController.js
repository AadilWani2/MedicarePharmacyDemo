const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 25, 
      entity, 
      action, 
      userId,
      startDate, 
      endDate,
      search 
    } = req.query;

    let query = {};

    if (entity) query.entity = entity;
    if (action) query.action = action;
    if (userId) query.user = userId;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { entityName: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ timestamp: -1 });

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [actionBreakdown, entityBreakdown, recentCount, totalCount] = await Promise.all([
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$entity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.countDocuments({ timestamp: { $gte: sevenDaysAgo } }),
      AuditLog.countDocuments()
    ]);

    res.json({
      success: true,
      stats: {
        totalLogs: totalCount,
        last7Days: recentCount,
        actionBreakdown,
        entityBreakdown
      }
    });
  } catch (error) {
    console.error('❌ Error fetching audit stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
