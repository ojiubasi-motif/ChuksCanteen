import jwt from 'jsonwebtoken';
import UserCollection from '../models/user.js';
// import company from '../models/company.js';

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader) {

        const token = authHeader.split(" ")[1];

        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) return res.status(403).json({ msg: "login credentials not authentic", type: "UNAUTHORIZED", code: 606 });
            // check for the user and update the req.user data
            const user_data = await UserCollection.findOne({ id: user?.id }, 'id email phone createdAt status previleges')
                // .populate({ path: 'company', select: 'id name', transform: (doc, id) => doc == null ? { _id: id } : doc })
                // .populate('office', 'id address');

            req.user = user_data._doc;
            // req.user===>{previlege id email phone company office}<===
            next();//continue execution after verification
        })
    } else {
        return res.status(403).json({ msg: "please login", type: "UNAUTHORIZED", code: 606 });
    }
}

export default verifyToken

// restrict access if user isn't the admin of the company
export const isAdmin = async (req, res, next) => {

    // const company_data = await UserCollection.findOne({ id: req.user?.id }, 'id name admins phone email');
    // if (!company_data) return next(
    //     res.status(403).json({
    //         msg: "company NOT found",
    //         type: "NOT_EXIST",
    //         code: 603,
    //     })
    // );
    if (!req.user?.previleges.includes(111)) {
        return next(
            res.status(403).json({
                msg: "you're NOT authorized to take this action, contact the company Admin",
                type: "NOT_AUTHORISED",
                code: 604,
            })
        )
    }

    // req.user = company_data;
    next();

}
