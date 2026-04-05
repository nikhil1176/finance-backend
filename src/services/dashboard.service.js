const FinancialRecord = require('../models/FinancialRecord');
const User = require('../models/User');

class DashboardService {
  static getOverview() {
    const summary = FinancialRecord.getSummary();
    const recentActivity = FinancialRecord.getRecentActivity(5);
    const topExpenseCategories = FinancialRecord.getTopCategories('expense', 5);
    const topIncomeCategories = FinancialRecord.getTopCategories('income', 5);

    return {
      summary: {
        totalIncome: summary.total_income, totalExpenses: summary.total_expenses,
        netBalance: summary.net_balance, totalRecords: summary.total_records,
      },
      topExpenseCategories, topIncomeCategories, recentActivity,
    };
  }

  static getCategoryBreakdown(type = null) {
    const categories = FinancialRecord.getCategoryTotals(type);
    const summary = FinancialRecord.getSummary();

    return categories.map(cat => {
      const total = cat.type === 'income' ? summary.total_income : summary.total_expenses;
      return { ...cat, percentage: total > 0 ? Math.round((cat.total_amount / total) * 10000) / 100 : 0 };
    });
  }

  static getMonthlyTrends(months = 12) {
    const trends = FinancialRecord.getMonthlyTrends(months);
    const monthMap = {};
    trends.forEach(row => {
      if (!monthMap[row.month]) monthMap[row.month] = { month: row.month, income: 0, expenses: 0, net: 0 };
      if (row.type === 'income') monthMap[row.month].income = row.total_amount;
      else monthMap[row.month].expenses = row.total_amount;
      monthMap[row.month].net = monthMap[row.month].income - monthMap[row.month].expenses;
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }

  static getWeeklyTrends(weeks = 12) {
    const trends = FinancialRecord.getWeeklyTrends(weeks);
    const weekMap = {};
    trends.forEach(row => {
      if (!weekMap[row.week]) weekMap[row.week] = { week: row.week, income: 0, expenses: 0, net: 0 };
      if (row.type === 'income') weekMap[row.week].income = row.total_amount;
      else weekMap[row.week].expenses = row.total_amount;
      weekMap[row.week].net = weekMap[row.week].income - weekMap[row.week].expenses;
    });
    return Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));
  }

  static getDailyTrends(days = 30) { return FinancialRecord.getDailyTotals(days); }

  static getRecentActivity(limit = 10) { return FinancialRecord.getRecentActivity(limit); }

  static getAnalytics() {
    const summary = FinancialRecord.getSummary();
    const monthlyTrends = DashboardService.getMonthlyTrends(6);
    const categoryBreakdown = DashboardService.getCategoryBreakdown();
    const userStats = {
      totalUsers: User.count(), activeUsers: User.count({ status: 'active' }),
      adminCount: User.count({ role: 'admin' }), analystCount: User.count({ role: 'analyst' }),
      viewerCount: User.count({ role: 'viewer' }),
    };

    let incomeChange = 0, expenseChange = 0;
    if (monthlyTrends.length >= 2) {
      const curr = monthlyTrends[monthlyTrends.length - 1];
      const prev = monthlyTrends[monthlyTrends.length - 2];
      incomeChange = prev.income > 0 ? Math.round(((curr.income - prev.income) / prev.income) * 10000) / 100 : 0;
      expenseChange = prev.expenses > 0 ? Math.round(((curr.expenses - prev.expenses) / prev.expenses) * 10000) / 100 : 0;
    }

    return {
      summary: { ...{ totalIncome: summary.total_income, totalExpenses: summary.total_expenses, netBalance: summary.net_balance, totalRecords: summary.total_records }, incomeChangePercent: incomeChange, expenseChangePercent: expenseChange },
      userStats, monthlyTrends, categoryBreakdown,
    };
  }
}

module.exports = DashboardService;