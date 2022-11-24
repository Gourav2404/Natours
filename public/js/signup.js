// /* eslint-disable */

// // import axios from 'axios';
// import { showAlert } from './alerts';

// export const signup = async (email, password) => {
//   try {
//     const res = await axios({
//       method: 'POST',
//       url: '/api/v1/users/signup',
//       data: {
//         email,
//         password
//       }
//     });

//     // console.log(res.data.status );
//     if (res.data.status === 'success') {
//       showAlert('success' , 'Signed up in successfully!');
//       window.setTimeout(() => {
//         location.assign('/');
//       }, 1500);
//     }
//   } catch (err) {
//     // console.log( err.response.data.message);
//     showAlert('error' , err.response.data.message);
//   }
// };
