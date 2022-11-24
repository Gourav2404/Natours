const path = require('path')
const express = require('express');
const morgan = require('morgan')
const rateLimit = require("express-rate-limit");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean')
const hpp = require('hpp')
const cookieParser = require('cookie-parser')
const compression = require('compression')
const cors = require('cors')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorControllers') 
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes')
const bookingRouter = require('./routes/bookingRoutes')

const app = express();

app.enable('trust proxy');

app.set('view engine' , 'pug');
app.set('views' , path.join(__dirname , 'views'));
//1)Global MIDDLEWARES

// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
// api.natours.com, front-end natours.com
// app.use(cors({
//   origin: 'https://www.natours.com'
// }))

app.options('*', cors());
// app.options('/api/v1/tours/:id', cors()); 

//serving static files
app.use(express.static(path.join(__dirname ,'public')));

// set security Http headers
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
        allowOrigins: ['*']
    },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['*'],
            scriptSrc: ["* data: 'unsafe-eval' 'unsafe-inline' blob:"]
        }
    }
}));

// Development Logger
console.log(process.env.NODE_ENV);
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

//limitrequest from same API
const limiter = rateLimit({
    max: 100 ,
    windowMs: 60 * 60 * 1000,
    message : 'Too many request from this IP, please try after 1 hour'
});
app.use('/api' , limiter)

// Body parser , reading data from body into req.body
app.use(express.json({limit : '10kb'}));
app.use(express.urlencoded({extended: true, limit: '10kb'}))
app.use(cookieParser())


// Data sanitization against NoSql query injection
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

// Prevents parameter pollution
app.use(hpp({
    whitelist : [
        'duration',
        'ratingsQuantity',
        'ratingAverage',
        'maxGroupSize',
        'difficulty',
        'price'
    ]
}))

app.use(compression())

//test middleware
app.use((req , res , next) => {
    req.requestTime = new Date().toISOString();
    // console.log(req.cookies);
    next();
})

//3)ROUTE HANDLERS

// app.get('/api/v1/tours' , getAllTour ) ;
// app.post('/api/v1/tours' , createTour);
// app.get('/api/v1/tours/:id' , getTour);
// app.patch('/api/v1/tours/:id' , updateTour);
// app.delete('/api/v1/tours/:id' , deleteTour);

app.use('/' , viewRouter);
app.use('/api/v1/tours' , tourRouter);
app.use('/api/v1/users' , userRouter);
app.use('/api/v1/reviews' , reviewRouter);
app.use('/api/v1/bookings' , bookingRouter)

app.all('*' , (req , res , next) => {

    // const err = new Error(`can t find ${req.originalUrl} on this server`)
    // err.status = 'fail';
    // err.statusCode = 404 ;
    // console.log(err);
    next(new AppError(`can t find ${req.originalUrl} on this server` , 404));
});

app.use(globalErrorHandler);

module.exports = app;