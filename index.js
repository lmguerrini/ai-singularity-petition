const express = require("express");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const db = require("./db");
const { hash, compare } = require("./bc");
const {
    requireLoggedOutUser,
    requireSignedPetition,
    requireUnsignedPetition,
    requireLoggedInUser,
    doCookieSafetyStuff,
} = require("./middleware");

const app = (exports.app = express());

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(express.static("./public"));

app.use(
    express.urlencoded({
        extended: false,
    })
);

app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 7 * 6,
    })
);

app.use(csurf());

// must be after app.use(csurf());
app.use(doCookieSafetyStuff);

app.get("/home", (req, res) => {
    res.render("home", {
        title: "Homepage",
        layout: "main",
    });
});

app.use(requireLoggedInUser);

/* app.use((req, res, next) => {
    console.log(`${req.method} request coming in on route ${req.url}`);
    next();
}); */

app.get("/", (req, res) => {
    // res.redirect("/register");
    res.redirect("/home");
});

app.get("/register", requireLoggedOutUser, (req, res) => {
    res.render("registration", {
        title: "Register form",
        layout: "main",
    });
});

app.post("/register", requireLoggedOutUser, (req, res) => {
    req.session.sigId = null;
    const { first, last, email, password } = req.body;
    let emptyValues = [];
    for (const key in req.body) {
        if (`${req.body[key]}` == "") {
            emptyValues.push(`${key}`);
        }
    }
    if (emptyValues.length == 0) {
        hash(password)
            .then((hash) => {
                db.addUser(first, last, email.toLowerCase(), hash)
                    .then(({ rows }) => {
                        req.session.userId = rows[0].id;
                        res.redirect("/profile");
                    })
                    .catch((err) => {
                        console.error("error in db.addUser catch: ", err);
                        if (
                            err ==
                            `error: duplicate key value violates unique constraint "users_email_key"`
                        ) {
                            res.render("registration", {
                                title: "Register form",
                                layout: "main",
                                accountAlreadyRegistrated: true,
                            });
                        } else {
                            res.render("registration", {
                                title: "Register form",
                                layout: "main",
                                error: true,
                            });
                        }
                    });
            })
            .catch((err) => {
                console.error("error in hash POST /register: ", err);
                res.render("registration", {
                    title: "Register form",
                    layout: "main",
                    error: true,
                });
            });
    } else {
        if (emptyValues.length > 1) {
            res.render("registration", {
                title: "Register form",
                layout: "main",
                emptyValues: true,
            });
        } else {
            res.render("registration", {
                title: "Register form",
                layout: "main",
                emptyValue: emptyValues,
            });
        }
    }
});

app.get("/login", requireLoggedOutUser, (req, res) => {
    res.render("login", {
        title: "Login",
        layout: "main",
    });
});

app.post("/login", requireLoggedOutUser, (req, res) => {
    const { email } = req.body;
    let emptyValues = [];
    for (const key in req.body) {
        if (`${req.body[key]}` == "") {
            emptyValues.push(`${key}`);
        }
    }
    if (emptyValues.length == 0) {
        db.getUserInfo(email)
            .then(({ rows }) => {
                if (rows.length > 0) {
                    const { password } = req.body;
                    compare(password, rows[0].password)
                        .then((result) => {
                            if (result) {
                                req.session.userId = rows[0].id;
                                res.redirect("/petition");
                            } else {
                                res.render("login", {
                                    layout: "main",
                                    error: true,
                                });
                            }
                        })
                        .catch((err) => {
                            console.error(
                                "error in compare POST /login catch: ",
                                err
                            );
                            res.render("login", {
                                layout: "main",
                                error: true,
                            });
                        });
                } else {
                    res.redirect("/register");
                }
            })
            .catch((err) => {
                console.error(
                    "error in POST /login db.getUserInfo catch: ",
                    err
                );
                res.render("login", {
                    layout: "main",
                    error: true,
                });
            });
    } else {
        if (emptyValues.length > 1) {
            res.render("login", {
                layout: "main",
                emptyValues: true,
            });
        } else {
            res.render("login", {
                layout: "main",
                emptyValue: emptyValues,
            });
        }
    }
});

app.get("/petition", requireUnsignedPetition, (req, res) => {
    res.render("petition", {
        title: "Petition home",
        layout: "main",
    });
});

app.post("/petition", requireUnsignedPetition, (req, res) => {
    const { signature } = req.body;
    const { userId } = req.session;
    db.addSignature(signature, userId)
        .then(({ rows }) => {
            //res.sendStatus(200);
            req.session.sigId = rows[0].id;
            res.redirect("/thanks");
        })
        .catch((err) => {
            console.error("error in db.addSignature catch: ", err);
            res.render("petition", {
                title: "Petition",
                layout: "main",
                error: true,
            });
        });
});

app.get("/thanks", requireSignedPetition, (req, res) => {
    db.getCountSigned()
        .then(({ rows }) => {
            const { userId } = req.session;
            let countSignedHB = rows[0].count;
            db.getSignature(userId)
                .then((result) => {
                    let signatureHB = result.rows[0].signature;
                    res.render("thanks", {
                        title: "Petition signed thanks",
                        layout: "main",
                        countSignedHB,
                        signatureHB,
                    });
                })
                .catch((err) => {
                    console.error("error in db.getSignature catch: ", err);
                });
        })
        .catch((err) => {
            console.error("error in db.getCountSigned catch: ", err);
        });
});

app.post("/thanks", requireSignedPetition, (req, res) => {
    const { editProfile, deleteSignature, LogOut } = req.body;
    if (editProfile === "") {
        res.redirect("/edit");
    }
    if (deleteSignature === "") {
        const { userId } = req.session;
        db.deleteSignature(userId)
            .then(() => {
                req.session.sigId = null;
                res.redirect("/petition");
            })
            .catch((err) => {
                console.error("error in db.deleteSignature catch: ", err);
                res.render("thanks");
            });
    }
    if (LogOut === "") {
        res.redirect("/logout");
    }
});

app.get("/signers", requireSignedPetition, (req, res) => {
    db.getSignersDetails()
        .then(({ rows }) => {
            res.render("signers", {
                title: "Signers",
                layout: "main",
                rows,
            });
        })
        .catch((err) => {
            console.error("error in db.getSignersDetails catch: ", err);
        });
});

app.get("/signers/:city", requireSignedPetition, (req, res) => {
    const { city } = req.params;

    db.getSignersByCity(city)
        .then(({ rows }) => {
            let cityLower = city.toLowerCase();
            const cityFirstUpper =
                cityLower.charAt(0).toUpperCase() + cityLower.slice(1);
            res.render("city", {
                title: "Signers/:city",
                layout: "main",
                rows,
                city: cityFirstUpper,
            });
        })
        .catch((err) => {
            console.error("error in db.getSignersByCity catch: ", err);
            res.render("signers", {
                layout: "main",
                error: true,
            });
        });
});

app.get(
    "/profile",
    requireUnsignedPetition,
    requireLoggedInUser,
    (req, res) => {
        res.render("profile", {
            title: "Profile",
            layout: "main",
        });
    }
);

app.post(
    "/profile",
    requireUnsignedPetition,
    requireLoggedInUser,
    (req, res) => {
        let { age, city, url } = req.body;
        let cityLower = city.toLowerCase();
        const cityFirstUpper =
            cityLower.charAt(0).toUpperCase() + cityLower.slice(1);
        city = cityFirstUpper;

        if (age == "" && url == "" && city == "") {
            res.render("profile", {
                title: "Profile",
                layout: "main",
                noValues: "Please enter at least your city",
            });
        } else if (age != "" && url == "" && city == "") {
            res.render("profile", {
                title: "Profile",
                layout: "main",
                noCity: "Please enter also your city",
            });
        } else if (age != "" && url != "" && city == "") {
            res.render("profile", {
                title: "Profile",
                layout: "main",
                noCity: "Please enter also your city",
            });
        } else if (age != "" && url != "" && city != "") {
            // city = city.charAt(0).toUpperCase() + city.slice(1);
            if (url.startsWith("http://") || url.startsWith("https://")) {
                const { userId } = req.session;
                db.addUserProfile(age, city, url.toLowerCase(), userId)
                    .then(() => {
                        res.redirect("/petition");
                    })
                    .catch((err) => {
                        console.error(
                            "error in db.addUserProfile catch: ",
                            err
                        );
                        res.render("profile", {
                            title: "Profile",
                            layout: "main",
                            error: true,
                        });
                    });
            } else {
                res.render("profile", {
                    title: "Profile",
                    layout: "main",
                    error: true,
                    falseUrl: true,
                });
            }
        } else if (age == "" && url != "" && city != "") {
            age = null;
            // city = city.charAt(0).toUpperCase() + city.slice(1);
            if (url.startsWith("http://") || url.startsWith("https://")) {
                const { userId } = req.session;
                db.addUserProfile(age, city, url.toLowerCase(), userId)
                    .then(() => {
                        res.redirect("/petition");
                    })
                    .catch((err) => {
                        console.error(
                            "error in db.addUserProfile catch: ",
                            err
                        );
                        res.render("profile", {
                            title: "Profile",
                            layout: "main",
                            error: true,
                        });
                    });
            } else {
                res.render("profile", {
                    title: "Profile",
                    layout: "main",
                    error: true,
                    falseUrl: true,
                });
            }
        } else if (age == "" && url != "" && city == "") {
            res.render("profile", {
                title: "Profile",
                layout: "main",
                error: true,
                falseUrl: true,
                noCity: "Please enter also your city",
            });
        } else if (age == "" && url == "" && city != "") {
            age = null;
            url = null;
            const { userId } = req.session;
            city = city.charAt(0).toUpperCase() + city.slice(1);

            db.addUserProfile(age, city, url, userId)
                .then(() => {
                    res.redirect("/petition");
                })
                .catch((err) => {
                    console.error("error in db.addUserProfile catch: ", err);
                    res.render("profile", {
                        title: "Profile",
                        layout: "main",
                        error: true,
                    });
                });
        } else {
            res.render("profile", {
                title: "Profile",
                layout: "main",
                error: true,
            });
        }
    }
);

app.get("/edit", requireLoggedInUser, (req, res) => {
    const { userId } = req.session;
    db.getUserInfoToEdit(userId)
        .then(({ rows }) => {
            res.render("edit", {
                title: "Edit section",
                layout: "main",
                rows,
            });
        })
        .catch((err) => {
            console.error("error in db.getUserInfoToEdit catch: ", err);
            res.render("edit", {
                title: "Edit section",
                layout: "main",
                error: true,
            });
        });
});

app.post("/edit", requireLoggedInUser, (req, res) => {
    const { password, first, last, email } = req.body;
    let { age, city, url } = req.body;
    const { userId } = req.session;
    let cityLower = city.toLowerCase();
    const cityFirstUpper =
        cityLower.charAt(0).toUpperCase() + cityLower.slice(1);
    city = cityFirstUpper;

    if (age == "") {
        age = null;
    }
    if (password != "") {
        hash(password)
            .then((hash) => {
                //const { first, last, email } = req.body;
                db.updateUserInfoPsw(
                    first,
                    last,
                    email.toLowerCase(),
                    hash,
                    userId
                )
                    .then(() => {
                        //const { age, city, url } = req.body;
                        if (
                            url.startsWith("http://") ||
                            url.startsWith("https://")
                        ) {
                            db.upsertUserProfileInfo(
                                age,
                                city,
                                url.toLowerCase(),
                                userId
                            )
                                .then(() => {
                                    res.redirect("/thanks");
                                })
                                .catch((err) => {
                                    console.error(
                                        "error in (if) db.upsertUserProfileInfo catch: ",
                                        err
                                    );
                                    res.render("edit", {
                                        title: "Edit profile",
                                        layout: "main",
                                        error: true,
                                    });
                                });
                        }
                    })
                    .catch((err) => {
                        console.error(
                            "error in (if) db.updateUserInfoPsw catch: ",
                            err
                        );
                        res.render("edit", {
                            title: "Edit profile",
                            layout: "main",
                            error: true,
                        });
                    });
            })
            .catch((err) => {
                console.error("error in hash POST /edit: ", err);
                res.render("edit", {
                    title: "Edit profile",
                    layout: "main",
                    error: true,
                });
            });
    } else {
        db.updateUserInfo(first, last, email, userId)
            .then(() => {
                //const { age, city, url } = req.body;
                if (
                    url.startsWith("http://") ||
                    url.startsWith("https://") ||
                    url == ""
                ) {
                    db.upsertUserProfileInfo(age, city, url, userId)
                        .then(() => {
                            res.redirect("/thanks");
                        })
                        .catch((err) => {
                            console.error(
                                "error in (else) db.upsertUserProfileInfo catch: ",
                                err
                            );
                            res.render("edit", {
                                title: "Edit profile",
                                layout: "main",
                                error: true,
                            });
                        });
                }
            })
            .catch((err) => {
                console.error("error in (else) db.updateUserInfo catch: ", err);
                if (
                    err ==
                    `error: duplicate key value violates unique constraint "users_email_key"`
                ) {
                    res.render("edit", {
                        title: "Edit profile",
                        layout: "main",
                        accountAlreadyRegistrated: true,
                    });
                } else {
                    res.render("edit", {
                        title: "Edit profile",
                        layout: "main",
                        error: true,
                    });
                }
            });
    }
});

app.get("/logout", requireLoggedInUser, (req, res) => {
    req.session.userId = null;
    res.redirect("/login");
});

app.get("*", (req, res) => {
    res.redirect("/");
});

if (require.main == module) {
    app.listen(process.env.PORT || 8080, () =>
        console.log("Petition server running on 8080..")
    );
}
