const express    = require('express')
const router     = express.Router()
const controller = require('../controllers/user.controller')
const { protect, authorize } = require('../middleware/auth')
const {
  updateProfileValidator,
  banValidator,
  createProfileValidator
} = require('../validators/user.validators')
const internalOnly = (req, res, next) => {
    const secret = req.headers['x-internal-secret']
    if(secret !== process.env.INTERNAL_SECRET){
        return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    next()
}

router.post(
  '/internal/create-profile',
  internalOnly,
  createProfileValidator,
  controller.createProfile
)

router.post(
  '/internal/update-role',
  internalOnly,
  controller.updateRole
)

router.get(
  '/internal/can-post',
  protect,
  controller.checkCanPost
)
router.get('/internal/age/:authId', controller.getAccountAge)
router.post(
  '/internal/increment-post-count',
  protect,
  controller.incrementPostCount
)

router.post(
  '/internal/increment-reputation',
  internalOnly,
  controller.incrementReputation
)

router.get(
  '/me',
  protect,
  controller.getMyProfile
)

router.put(
  '/me',
  protect,
  updateProfileValidator,
  controller.updateProfile
)

router.get(
  '/',
  protect,
  authorize('admin'),
  controller.getAllUsers
)

router.put(
  '/:id/ban',
  protect,
  authorize('admin'),
  banValidator,
  controller.banUser
)

router.put(
  '/:id/unban',
  protect,
  authorize('admin'),
  controller.unbanUser
)

router.get(
  '/:id',
  controller.getPublicProfile
)

module.exports = router