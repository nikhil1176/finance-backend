const express = require('express');
const router = express.Router();
const DashboardService = require('../services/dashboard.service');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ApiResponse = require('../utils/ApiResponse');

router.use(authenticate);

router.get('/overview', authorize('dashboard:read'), (req, res, next) => {
  try {
    const data = DashboardService.getOverview();
    ApiResponse.success(res, data, 'Dashboard overview retrieved');
  } catch (error) { next(error); }
});

router.get('/categories', authorize('dashboard:read'), (req, res, next) => {
  try {
    const { type } = req.query;
    const data = DashboardService.getCategoryBreakdown(type || null);
    ApiResponse.success(res, data, 'Category breakdown retrieved');
  } catch (error) { next(error); }
});

router.get('/trends/monthly', authorize('dashboard:read'), (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const data = DashboardService.getMonthlyTrends(months);
    ApiResponse.success(res, data, 'Monthly trends retrieved');
  } catch (error) { next(error); }
});

router.get('/trends/weekly', authorize('dashboard:read'), (req, res, next) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;
    const data = DashboardService.getWeeklyTrends(weeks);
    ApiResponse.success(res, data, 'Weekly trends retrieved');
  } catch (error) { next(error); }
});

router.get('/trends/daily', authorize('dashboard:read'), (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = DashboardService.getDailyTrends(days);
    ApiResponse.success(res, data, 'Daily trends retrieved');
  } catch (error) { next(error); }
});

router.get('/recent', authorize('dashboard:read'), (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = DashboardService.getRecentActivity(limit);
    ApiResponse.success(res, data, 'Recent activity retrieved');
  } catch (error) { next(error); }
});

router.get('/analytics', authorize('dashboard:analytics'), (req, res, next) => {
  try {
    const data = DashboardService.getAnalytics();
    ApiResponse.success(res, data, 'Analytics retrieved');
  } catch (error) { next(error); }
});

module.exports = router;