const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError');
const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./../controllers/handlerFactory');


const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') req.file
// upload.array('images', 5) req.files


exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      // console.log(filename);
      req.body.images.push(filename);
    })
  );

  // console.log(req.body);
  next();
});

exports.aliesTopTour = (req , res , next ) => {
        req.query.limit = '5' ;
        req.query.sort = 'price -ratingsAverage';
        req.query.fields = 'name ratingsAverage price difficulty summary' ;
        next();
    }
    
exports.getAllTour = factory.getAll(Tour)
exports.getTour = factory.getOne(Tour, {path : 'reviews'})
exports.createTour = factory.createOne(Tour)
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour)


// exports.getAllTour = catchAsync( async (req , res, next) => {

//         //EXECUTE QUERY
//         const features = new APIFeatures(Tour.find(), req.query)
//             .filter()
//             .sort()
//             .limitFields()
//             .paginate()
//         const tours = await features.query ;
//         // console.log(req.requestTime);
//         //SEND RESPONSE
//         res.status(200).json({
//             status : 'sucess' ,
//             result : tours.length ,
//             data: {
//                 tours
//             }
//         })
// });

exports.getTourStats =catchAsync( async (req , res ,next) => {
        const stats = await Tour.aggregate([
            {
                $match: { ratingsAverage : { $gte : 4.5} }
            } ,
            {
                $group: {
                    // _id : '$ratingsAverage' ,
                    // _id : null ,
                    // _id : '$name' ,
                    // _id : { $toUpper :'$difficulty' } ,
                    _id : '$difficulty' ,
                    numTour : { $sum : 1},
                    numRating : { $sum : '$ratingsQuantity'},
                    avgRating : { $avg : '$ratingsAverage' },
                    avgPrice : { $avg : '$price'} ,
                    minPrice : { $min : '$price'},
                    maxPrice : { $max : '$price'}
                }
            } ,
            {
                $sort : { avgPrice : 1}
            } , 
            {
                $match : { _id : { $ne : "EASY"}    }
            }
        ])
        // console.log(stats);
        res.status(200).json({
            status : 'success' ,
            data : {
                stats
            }
        }); 
});

exports.getMonthlyPlan =catchAsync( async (req, res , next) => {
    
        const year = req.params.year * 1 ;
        
        const plan = await Tour.aggregate([
            {
                $unwind : '$startDates'
            },
            {
                $match : { 
                    startDates: { 
                        $gte: new Date(`${year}-01-01`) ,
                        $lte: new Date(`${year}-12-31`)
                    }   
                }
            } ,
            {
                $group : {
                    _id : {$month : '$startDates'},
                    numTourStarts : {$sum : 1},
                    tourName : { $push : '$name' } ,
                }
            } ,
            {
                $addFields : { month : '$_id'}
            },
            {
                $project : {
                    _id : 0
                }
            },
            {
                $sort : {
                    numTourDtarts: - 1
                }
            },
            {
                $limit : 12
            }
        ])
        // console.log();
        res.status(200).json({
            status : 'success' ,
            data : {
                plan
            }
        });
    
});

// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/33.89245848365563,-118.37306957844564/unit/mi
exports.getToursWithin =catchAsync(async (req, res, next)=> {
    const { distance, latlang, unit } = req.params;
    const [lat, lang] = latlang.split(',')

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1 ;
    if(!lat || !lang){
        next(
            new AppError('please provide latitude and longitude in the format of lat and lang' , 400)
        );
    };


    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lang , lat] , radius]}}
    })

    res.status(200).json({
        status : 'success',
        result: tours.length ,
        data: {
            data : tours
        }
    })
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlang, unit } = req.params;
    const [lat, lang] = latlang.split(',');
  
    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  
    if (!lat || !lang) {
      next(
        new AppError(
          'Please provide latitude and longitude in the format lat,lng.',
          400
        )
      );
    }
  
    const distances = await Tour.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lang * 1, lat * 1]
          },
          distanceField: 'distance',
          distanceMultiplier: multiplier
        }
      },
      {
        $project: {
          distance: 1,
          name: 1
        }
      }
    ]);
  
    res.status(200).json({
      status: 'success',
      data: {
        data: distances
      }
    });
  });
  