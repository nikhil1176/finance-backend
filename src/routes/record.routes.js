const express = require('express');
const router = express.Router();
const RecordService = require('../services/record.service');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { validateCreateRecord, validateUpdateRecord } = require('../validators/record.validator');
const ApiResponse = require('../utils/ApiResponse');

router.use(authenticate);

router.get('/', authorize('record:read'), (req, res, next) => {
  try {
    const result = RecordService.getRecords(req.query);
    ApiResponse.paginated(res, result.records, result.pagination, 'Records retrieved');
  } catch (error) { next(error); }
});

router.get('/:id', authorize('record:read'), (req, res, next) => {
  try {
    const record = RecordService.getRecordById(req.params.id);
    ApiResponse.success(res, { record }, 'Record retrieved');
  } catch (error) { next(error); }
});

router.post('/', authorize('record:create'), validate(validateCreateRecord), (req, res, next) => {
  try {
    const record = RecordService.createRecord(req.body, req.user);
    ApiResponse.created(res, { record }, 'Record created');
  } catch (error) { next(error); }
});

router.put('/:id', authorize('record:update'), validate(validateUpdateRecord), (req, res, next) => {
  try {
    const record = RecordService.updateRecord(req.params.id, req.body, req.user);
    ApiResponse.success(res, { record }, 'Record updated');
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('record:delete'), (req, res, next) => {
  try {
    const hard = req.query.hard === 'true';
    RecordService.deleteRecord(req.params.id, req.user, hard);
    ApiResponse.success(res, null, hard ? 'Record permanently deleted' : 'Record soft deleted');
  } catch (error) { next(error); }
});

router.post('/:id/restore', authorize('record:update'), (req, res, next) => {
  try {
    RecordService.restoreRecord(req.params.id, req.user);
    ApiResponse.success(res, null, 'Record restored');
  } catch (error) { next(error); }
});

module.exports = router;