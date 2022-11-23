const express = require('express');

const tourController = require("../controllers/tourController");
const authentiController = require('./../controllers/authentiController');
const reviewRouter = require('./../routes/reviewRoutes')

const router = express.Router();

// router.param('id', tourController.chcekId);

//POST /tour/12312/review
//GET /tour/1231/reviews
//GET /tour/1231/reviews/123231

router.use('/:tourId/reviews' , reviewRouter)

router.route('/top-5-cheap').get(tourController.aliesTopTour ,tourController.getAllTour)

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(authentiController.protect , authentiController.restrictTo('admin' , 'lead-guide' , 'guides'), tourController.getMonthlyPlan);

router.route('/tours-within/:distance/center/:latlang/unit/:unit').get(tourController.getToursWithin)
// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi
router.route('/distances/:latlang/unit/:unit').get(tourController.getDistances);



router.route('/')
    .get(tourController.getAllTour)
    .post(authentiController.protect , authentiController.restrictTo('admin' , 'lead-guide'), tourController.createTour);
router.route('/:id')
    .get(tourController.getTour)
    .patch(authentiController.protect, authentiController.restrictTo('admin' , 'lead-guide'), tourController.uploadTourImages, tourController.resizeTourImages , tourController.updateTour)
    .delete(authentiController.protect , authentiController.restrictTo('admin' , 'lead-guide'), tourController.deleteTour);


module.exports = router;