import CryptoJS from 'crypto-js';

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashOtp(otp) {
  return CryptoJS.SHA256(otp).toString();
}
