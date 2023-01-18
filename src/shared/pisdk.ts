import { PiApprove, PiPaymentFound, PiTip } from "lemmy-js-client";
import { WebSocketService } from "./services";
import { wsClient } from "./utils";

export async function createPayment(
  config: any,
  domain: string,
  object_id?: string,
  comment?: string,
  auth?: string
) {
  var piUser;
  const authenticatePiUser = async () => {
    // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
    const scopes = ["username", "payments"];
    try {
      var user = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
      return user;
    } catch (err) {
      console.log(err);
    }
  };

  const onIncompletePaymentFound = async (payment) => {    
    //do something with incompleted payment
    var found = new PiPaymentFound();
    found.domain = domain;
    found.pi_username = piUser.user.username;
    found.pi_token = piUser.accessToken;
    found.pi_uid = piUser.user.uid;
    found.paymentid = payment.identifier;
    found.auth = auth;
    found.person_id = undefined;
    found.comment = comment;
    payment.metadata = undefined;
    found.dto = payment; 
    console.log(JSON.stringify(found));
    WebSocketService.Instance.send(wsClient.piPaymentFound(found));
    return;
  }; // Read more about this in the SDK reference

  const onReadyForApproval = async (payment_id, paymentConfig) => {
    var approve = new PiApprove();
    approve.domain = domain;
    approve.pi_username = piUser.user.username;
    approve.pi_token = piUser.accessToken;
    approve.pi_uid = piUser.user.uid;
    approve.paymentid = payment_id;
    approve.object_id = object_id;
    approve.comment = comment;
    approve.auth = auth;
    WebSocketService.Instance.send(wsClient.piApprove(approve));
  };

  const onReadyForCompletion = (payment_id, txid, paymentConfig) => {
    var payment = new PiTip();
    payment.domain = domain;
    payment.pi_username = piUser.user.username;
    payment.pi_token = piUser.accessToken;
    payment.pi_uid = piUser.user.uid;
    payment.paymentid = payment_id;
    payment.object_id = object_id;
    payment.comment = comment;
    payment.auth = auth;
    payment.txid = txid;
    WebSocketService.Instance.send(wsClient.piPayment(payment));
  };

  const onCancel = paymentId => {
    console.log("Pi Payment cancelled: ", paymentId);
  };
  const onError = (err, paymentId) => {
    console.log("Pi Payment error: ", paymentId + " " + JSON.stringify(err));
  };

  const createPiPayment = async config => {
    window.Pi.createPayment(config, {
      // Callbacks you need to implement - read more about those in the detailed docs linked below:
      onReadyForServerApproval: payment_id =>
        onReadyForApproval(payment_id, config),
      onReadyForServerCompletion: (payment_id, txid) =>
        onReadyForCompletion(payment_id, txid, config),
      onCancel: onCancel,
      onError: onError,
    });
  };

  try {
    piUser = await authenticatePiUser();
    await createPiPayment(config);
  } catch (err) {
    console.log("createPiPayment error: " + JSON.stringify(err));
  }
}

// import axios from './axios';
// //import { * } from "./utils";
// //const Pi = window.Pi;
// var piUser;
// var piApiResult = null;
// export const authenticatePiUser = async () => {
//     // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
//     const scopes = ['username','payments'];
//     //if (piUser === "undefined")
//     {
//         try
//         {
//             if (typeof window !== "undefined") {
//                 piUser = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
//                 return piUser;
//             }

//         } catch(err) {
//             console.log(err)
//         }
//     }
//     return piUser;
// }

// export const piApiResponsee = () => {
//     return piApiResult;
// }

// export const onIncompletePaymentFound = async (payment) => {
//     //do something with incompleted payment
//     console.log('incomplete payment found: ', payment)
//     alert(payment);
//     const { data, status } = await axios.post('/pi/found', {
//         paymentid: payment.identifier,
// 	    pi_username: piUser.user.username,
// 	    pi_uid: piUser.user.uid,
//         auth: null,
//         dto: null
//     });

//     if (status === 500) {
//         //there was a problem approving this payment show user body.message from server
//         alert(`${body.status}: ${body.message}`);
//         return false;
//     }

//     if (status === 200) {
//         //payment was approved continue with flow
//         alert(payment);
//         return data;
//     }
// }; // Read more about this in the SDK reference

// export const createPiRegister = async (info, config) => {
//     piApiResult = null;
//     if (typeof window !== "undefined") {
//         window.Pi.createPayment(config, {
//         // Callbacks you need to implement - read more about those in the detailed docs linked below:
//         onReadyForServerApproval: (payment_id) => onReadyForApprovalRegister(payment_id, info, config),
//         onReadyForServerCompletion:(payment_id, txid) => onReadyForCompletionRegister(payment_id, txid, info, config),
//         onCancel,
//         onError,
//       });
//     }
// }

// export const onReadyForApprovalRegister = async (payment_id, info, paymentConfig) => {
//     //make POST request to your app server /payments/approve endpoint with paymentId in the body

//     const { data, status } = await axios.post('/pi/agree', {
// 	    paymentid: payment_id,
// 	    pi_username: piUser.user.username,
// 	    pi_uid: piUser.user.uid,
// 	    info,
//         paymentConfig
//     })

//     if (status === 500) {
//         //there was a problem approving this payment show user body.message from server
//         alert(`${body.status}: ${body.message}`);
//         return false;
//     }

//     if (status === 200) {
//         //payment was approved continue with flow
//         return data;
//     }
// }

// // Update or change password
// export const onReadyForCompletionRegister = async (payment_id, txid, info, paymentConfig) => {
//     //make POST request to your app server /payments/complete endpoint with paymentId and txid in the body
//     const { body, status } = await axios.post('/pi/register', {
//         paymentid: payment_id,
//         pi_username: piUser.user.username,
//         pi_uid: piUser.user.uid,
//         txid,
// 	    info,
// 	    paymentConfig,
//     })

//     if (status === 500) {
//         //there was a problem completing this payment show user body.message from server
//         alert(`${body.status}: ${body.message}`);
//         return false;
//     }

//     if (status === 200) {
//         //payment was completed continue with flow
//         piApiResult["success"] = true;
//         piApiResult["type"] = "account";
//         return true;
//     }
// }

// export const createPiPayment = async (config) => {
//     piApiResult = null;
//     if (typeof window !== "undefined") {
//     window.Pi.createPayment(config, {
//         // Callbacks you need to implement - read more about those in the detailed docs linked below:
//         onReadyForServerApproval: (payment_id) => onReadyForApproval(payment_id, config),
//         onReadyForServerCompletion: onReadyForCompletion,
//         onCancel,
//         onError,
//       });
//     }
// }

// export const onReadyForApproval = async (payment_id, paymentConfig) => {
//     //make POST request to your app server /pi/approve endpoint with paymentId in the body

//     const { data, status } = await axios.post('/pi/approve', {
//         payment_id,
//         paymentConfig
//     })

//     if (status === 500) {
//         //there was a problem approving this payment show user body.message from server
//         alert(`${data.status}: ${data.message}`);
//         return false;
//     }

//     if (status === 200) {
//         //payment was approved continue with flow
//         return data;
//     }
// }

// export const onReadyForCompletion = async (payment_id, txid) => {
//     //make POST request to your app server /pi/complete endpoint with paymentId and txid in the body
//     const { data, status } = await axios.post('/pi/complete', {
//         payment_id,
//         txid
//     })

//     if (status === 500) {
//         //there was a problem completing this payment show user body.message from server
//         alert(`${data.status}: ${data.message}`);
//         return false;
//     }

//     if (status === 200) {
//         //payment was completed continue with flow
//         piApiResult["success"] = true;
//         piApiResult["type"] = "tip";
//         return true;
//     }
// }

// export const onCancelRegister = (paymentId) => {
//     console.log('payment cancelled', paymentId)
// }

// export const onErrorRegister = (error, paymentId) => {
//     console.log('onError', error, paymentId)
// }
// export const onCancel = (paymentId) => {
//     console.log('payment cancelled', paymentId)
// }

// export const onError = (error, paymentId) => {
//     console.log('onError', error, paymentId)
// }

// export const openPiShareDialog = (title, message) => {
//     if (typeof window !== "undefined") {
//         window.Pi.openShareDialog(title, message)
//     }
// }
