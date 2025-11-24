const NodemailerHelper = require('nodemailer-otp');
const {hash} = require('@node-rs/argon2');

const helper = new NodemailerHelper(process.env.EMAIL_ID, process.env.EMAIL_PASS);

// Creating and sending otp through email
async function sendOtpEmail(email){
    const otp = helper.generateOtp(6);
    console.log(otp);

    hashedOtp = await hash(otp, 10)
    await helper.sendEmail(
        email,
        'BLKND OTP  verification',
        "verify your account using this otp ",
        otp
    );

    return hashedOtp;
}

module.exports = {sendOtpEmail};