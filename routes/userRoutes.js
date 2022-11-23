const express = require('express');
const userController = require('./../controllers/userController');
const authentiController = require('./../controllers/authentiController');


const router = express.Router();

router.post('/signup' , authentiController.signup)
router.post('/login' , authentiController.login)
router.get('/logout' , authentiController.logout)
router.post('/forgotpassword' , authentiController.forgotPassword)
router.patch('/resetpasword/:token' , authentiController.restPassword)

//protect all routes after this middleware
router.use(authentiController.protect)

router.patch('/updatePassword', authentiController.updatePassword)
router.patch('/updateMe', userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe)
router.delete('/deleteMe', userController.deleteMe)
router.get('/me', userController.getMe , userController.getUser)

router.use(authentiController.restrictTo('admin'))

router.route('/').get(userController.getAllUsers).post(userController.createUser)
router.route('/:id').get(userController.getUser).patch(userController.updateUser).delete(userController.deleteUser)

module.exports = router ;