import axios from './axios';

const Pi = window.Pi;

export const authenticatePiUser = async () => {
    // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
    const scopes = ['payments'];
    
    try{
        return await Pi.authenticate(scopes, onIncompletePaymentFound);
    } catch(err) {
        console.log(err)
    }
}

export const createPiPayment = async (config) => {
    Pi.createPayment(config, {
        // Callbacks you need to implement - read more about those in the detailed docs linked below:
        onReadyForServerApproval: (paymentId) => onReadyForApproval(paymentId, config),
        onReadyForServerCompletion: onReadyForCompletion,
        onCancel,
        onError,
      });
}

export const onIncompletePaymentFound = (payment) => { 
    //do something with incompleted payment
    console.log('incomplete payment found: ', payment) 
}; // Read more about this in the SDK reference

export const onReadyForApproval = async (paymentId, paymentConfig) => {
    //make POST request to your app server /payments/approve endpoint with paymentId in the body
    
    const { data, status } = await axios.post('/payments/approve', {
        paymentId,
        paymentConfig
    })

    if (status === 500) {
        //there was a problem approving this payment show user body.message from server
        alert(`${body.status}: ${body.message}`);
        return false;
    } 

    if (status === 200) {
        //payment was approved continue with flow
        return data;
    }
}

export const onReadyForCompletion = async (paymentId, txid) => {
    //make POST request to your app server /payments/complete endpoint with paymentId and txid in the body
    const { body, status } = await axios.post('/payments/complete', {
        paymentId, 
        txid
    })

    if (status === 500) {
        //there was a problem completing this payment show user body.message from server
        alert(`${body.status}: ${body.message}`);
        return false;
    } 

    if (status === 200) {
        //payment was completed continue with flow
        return true;
    }
}

export const onCancel = (paymentId) => {
    console.log('payment cancelled', paymentId)
}

export const onError = (error, paymentId) => { 
    console.log('onError', error, paymentId) 
}

export const openPiShareDialog = (title, message) => {
    Pi.openShareDialog(title, message)
}