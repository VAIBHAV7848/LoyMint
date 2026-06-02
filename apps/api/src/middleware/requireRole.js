const AppError = require('../utils/AppError');

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || !req.user.profileCompleted) {
      return next(new AppError('Please complete your profile registration first.', 403));
    }
    
    if (req.user.role !== role) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    
    next();
  };
};

module.exports = requireRole;
