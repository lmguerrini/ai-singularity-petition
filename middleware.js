exports.doCookieSafetyStuff = (req, res, next) => {
    res.set("x-frame-options", "deny");
    res.locals.csrfToken = req.csrfToken();
    next();
};

module.exports.requireLoggedInUser = (req, res, next) => {
    if (!req.session.userId && req.url != "/register" && req.url != "/login") {
        // res.redirect("/register");
        res.redirect("/home");
    } else {
        next();
    }
};

exports.requireLoggedOutUser = (req, res, next) => {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

exports.requireSignedPetition = (req, res, next) => {
    if (!req.session.sigId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

exports.requireUnsignedPetition = (req, res, next) => {
    if (req.session.sigId) {
        res.redirect("/thanks");
    } else {
        next();
    }
};
