const nodemailer = require('nodemailer');
const { hash } = require('@node-rs/argon2');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
    }
});

const sendOtpEmail = async (email) => {
    try {
        const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
        
        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify Your Email",
            html: `<p>Your OTP verification code is <b>${otp}</b>. It expires in 1 hour.</p>`
        };

        await transporter.sendMail(mailOptions);
        
        // Return hashed OTP
        return await hash(otp); 
    } catch (error) {
        console.log("Error sending OTP:", error);
        throw error;
    }
};

const sendCustomMessage = async (toEmail, subject, content) => {
    try {
        const mailOptions = {
            from: `"BLKND Support" <${process.env.NODEMAILER_EMAIL}>`,
            to: toEmail,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">BLKND</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 20px;">
                        ${content.replace(/\n/g, '<br>')}
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
                    <p style="font-size: 12px; color: #888;">© BLKND. All rights reserved.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${toEmail}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Error sending email to ${toEmail}:`, error);
        return false;
    }
};

module.exports = { 
    sendOtpEmail, 
    sendCustomMessage 
};