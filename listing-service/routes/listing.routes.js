const express = require('express')
const multer  = require('multer')
const router  = express.Router()

const controller = require('../controllers/listing.controller')
const { protect, authorize } = require('../middleware/auth')
const {
  createListingValidator,
  updateListingValidator,
  searchValidator
} = require('../validators/listing.validators')

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files allowed'), false)
    }
  }
})

router.get('/internal/opposite', controller.getOppositeListings)

router.get('/',     searchValidator, controller.getAllListings)
router.get('/my',   protect, controller.getMyListings)

router.post('/', protect, upload.array('images', 5), createListingValidator, controller.createListing)

router.put('/:id/resolve', protect, controller.markResolved)
router.delete('/:id/admin', protect, authorize('admin'), controller.adminRemove)
router.put('/:id',    protect, updateListingValidator, controller.updateListing)
router.delete('/:id', protect, controller.deleteListing)
router.get('/:id',    controller.getListingById)

module.exports = router
