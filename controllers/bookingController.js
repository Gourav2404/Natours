const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  try{

     // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);
    // console.log(tour.name);
    // console.log(`${req.protocol}://${req.get('host')}/`) 


    // 2) Create checkout session
    const session = await stripe.checkout.sessions.create({
      // success_url:`${req.protocol}://${req.get('host')}/my-tours/?tour=${req.params.tourId}`,
      success_url:`${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
      cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
      client_reference_id: req.params.tourId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tour.name} Tour`,
              description: tour.summary,
              // images: [`http://127.0.0.1:3000/img/tours/${tour.imageCover}`],
              images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
            },
            unit_amount: `${tour.price}` * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
    });


    // 3) Create session as response
    res.status(200).json({
      status: 'success',
      session
    });
  }catch(err){
    res.status(400).json({
      status: 'fail',
      err
    });
  }
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
