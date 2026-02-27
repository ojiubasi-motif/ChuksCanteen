import express from "express";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import user from "../models/user.js";
// import sendEmail from '../utils/email.js'
// import sendGrid from "../utils/sendGrid.js";
// import zohoMail from "../utils/zoho.js";
import moment from "moment";
import { generateOtp, hashOtp } from "../utils/otp.js";
import mongoose from 'mongoose';


const router = express.Router();

// login===
router.post("/accounts/auth", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(401).json({
        msg: "login data missing",
        type: "WRONG_OR_MISSING_PAYLOAD",
        code: 605,
    });
    try {
        // check the kind of input supplied by the user for login
        const userData = await user.findOne({ email }, '-_id -updatedAt -__v')
        //   .populate('company', 'id')
        //   .populate('office', 'id address');

        if (!userData) {
            return res.status(401).json({
                msg: "user not found, signup",
                type: "WRONG_OR_MISSING_PAYLOAD",
                code: 605,
            });
        } else {
            const bytes = CryptoJS.AES.decrypt(
                userData?.password,
                process.env.PW_CRYPT
            );
            const originalPassword = bytes.toString(CryptoJS.enc.Utf8);

            if (originalPassword !== password) {
                return res.status(401).json({
                    msg: "wrong login credentials",
                    type: "WRONG_OR_MISSING_PAYLOAD",
                    code: 605,
                });
            } else {

                const access_token = jwt.sign(
                    {
                        id: userData?.id,
                        email: userData?.email,
                        phone: userData?.phone
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: "1d" }
                    // 25minutes 1 day
                );
                // create a refresh token for loggedin user
                const refresh_token = jwt.sign(
                    {
                        email: userData?.email,
                        roles: userData?.previleges,
                        // company: userData?.company?.id,
                        // office: userData?.office?.id,
                        // status: userData?.status,
                        id: userData?.id,
                    },
                    process.env.REFRESH_TOKEN_SECRET,
                    { expiresIn: "1d" }
                    // 30m
                );
                // console.log("tokens=====>", accessToken, refreshToken);
                // save the refresh token to the loggedin user incase o
                const updated_user = await user.findOneAndUpdate(
                    { email },
                    { $set: { refresh_token, last_loggin: moment() } }, { new: true }
                );
                // console.log("let's set cookies for loggedin=>", refreshToken)
                res.cookie("jwt", refresh_token, {
                    httpOnly: true,
                    sameSite: "None",
                    secure: true,
                    maxAge: 24 * 60 * 60 * 1000,
                });

                // ========test email sending======
                // 
                // const resetPasswordUrl = `${req.protocol}://${req.get('host')}/api/v1/resetPassword`;
                // const message = `SENDGRID::=>please reset your password with this link\n\n${resetPasswordUrl}\n\nThis reset link is valid for only 10 minutes.`;

                //   await zohoMail({
                //     user_email: 'ubasioji@gmail.com', // Change to your recipient
                //     // subject: 'Sending with SendGrid is Fun',
                //     // message,
                //     // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
                //   });
                // res.status(200).json({ msg: "email send success", type: "SUCCESS", code: 600 });


                // =======test end============
                const {
                    password: saved_password,
                    updatedAt,
                    refresh_token: user_refresh,
                    first_name,
                    last_name,
                    last_loggin,
                    // phone,
                    __v,
                    _id,
                    ...data
                } = userData._doc;
                // { msg: "staff created success", data, type: "SUCCESS", code: 600 }
                // console.log("looged in==>", userData)
                res.status(200).json({ msg: "login success", data: { user: { ...data, full_name: `${first_name} ${last_name}`, last_loggin: updated_user?.last_loggin, company: { id: userData?.company?.id, name: userData?.company?.name } }, access_token }, type: "SUCCESS", code: 600 });
            }
        }
    } catch (err) {
        res.status(500).json({ msg: err, type: "FAILED", code: 602 });
    }
});

// signup ===
router.post("/auth/signup", async (req, res) => {
    const { email, phone, password, first_name, last_name, referralCode } = req.body;
    if (!password || (!email && !phone))
        return res.status(400).json({ msg: "missing signup data", type: "WRONG_OR_MISSING_PAYLOAD", code: 606 });
    try {
        const existing = await user.findOne({ $or: [{ email }, { phone }] });
        if (existing)
            return res.status(409).json({ msg: "email or phone already exists", type: "CONFLICT", code: 609 });

        const encrypted = CryptoJS.AES.encrypt(password, process.env.PW_CRYPT).toString();
        const rawOtp = generateOtp();
        const hashed = hashOtp(rawOtp);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

        const newUser = new user({
            id: Date.now().toString(),
            first_name: first_name || "",
            last_name: last_name || "",
            email: email || "",
            phone: phone || "",
            password: encrypted,
            referralCode: referralCode || null,
            otp: { code: hashed, expiresAt: otpExpiry },
            isVerified: false,
        });

        await newUser.save({ validateBeforeSave: false });
        console.log(`OTP for user ${newUser.id}: ${rawOtp}`);

        const resp = { msg: "signup success, otp sent", data: { id: newUser.id }, type: "SUCCESS", code: 610 };
        if (process.env.NODE_ENV !== 'production') resp.rawOtp = rawOtp;
        return res.status(201).json(resp);
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: "FAILED", code: 602 });
    }
});

// dev-only: create user directly (bypass Mongoose schema validation)
router.post('/auth/dev/create-user', async (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ msg: 'forbidden' });
    try {
        const { email, phone, password, first_name, last_name, referralCode } = req.body;
        const encrypted = CryptoJS.AES.encrypt(password || 'devpass', process.env.PW_CRYPT).toString();
        const rawOtp = generateOtp();
        const hashed = hashOtp(rawOtp);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        const doc = {
            id: Date.now().toString(),
            first_name: first_name || 'Dev',
            last_name: last_name || 'User',
            email: email || '',
            phone: phone || '',
            password: encrypted,
            referralCode: referralCode || null,
            otp: { code: hashed, expiresAt: otpExpiry },
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await mongoose.connection.db.collection('users').insertOne(doc);
        console.log('DEV OTP for', doc.id, rawOtp);
        return res.status(201).json({ msg: 'dev user created', id: doc.id, rawOtp });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err });
    }
});

// verify otp ===
router.post("/auth/verify-otp", async (req, res) => {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ msg: "missing payload", type: "WRONG_OR_MISSING_PAYLOAD", code: 606 });
    try {
        const found = await user.findOne({ id: userId });
        if (!found) return res.status(404).json({ msg: "user not found", type: "NOT_FOUND", code: 604 });
        if (!found.otp || !found.otp.expiresAt) return res.status(400).json({ msg: "no otp pending", type: "NO_OTP", code: 607 });
        if (new Date() > new Date(found.otp.expiresAt)) return res.status(400).json({ msg: "otp expired", type: "OTP_EXPIRED", code: 608 });
        if (hashOtp(otp) !== found.otp.code) return res.status(400).json({ msg: "invalid otp", type: "OTP_INVALID", code: 609 });

        found.isVerified = true;
        found.otp = { code: null, expiresAt: null };
        await found.save();

        const access_token = jwt.sign({ id: found?.id, email: found?.email, phone: found?.phone }, process.env.JWT_SECRET, { expiresIn: "1d" });
        const refresh_token = jwt.sign({ email: found?.email, roles: found?.previleges, status: found?.status, id: found?.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1d" });

        await user.findOneAndUpdate({ id: userId }, { $set: { refresh_token, last_loggin: moment() } });

        res.cookie("jwt", refresh_token, { httpOnly: true, sameSite: "None", secure: true, maxAge: 24 * 60 * 60 * 1000 });
        const { password: saved_password, __v, _id, ...data } = found._doc;
        return res.status(200).json({ msg: "verification success", data: { user: data, access_token }, type: "SUCCESS", code: 600 });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: "FAILED", code: 602 });
    }
});

// resend otp ===
router.post("/auth/resend-otp", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ msg: "missing userId", type: "WRONG_OR_MISSING_PAYLOAD", code: 606 });
    try {
        const found = await user.findOne({ id: userId });
        if (!found) return res.status(404).json({ msg: "user not found", type: "NOT_FOUND", code: 604 });
        const rawOtp = generateOtp();
        const hashed = hashOtp(rawOtp);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await user.findOneAndUpdate({ id: userId }, { $set: { otp: { code: hashed, expiresAt: otpExpiry } } });
        console.log(`Resent OTP for user ${userId}: ${rawOtp}`);
        return res.status(200).json({ msg: "otp resent", type: "SUCCESS", code: 611 });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: "FAILED", code: 602 });
    }
});

export default router;