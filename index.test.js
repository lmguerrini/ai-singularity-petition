const supertest = require("supertest");
const { app } = require("./index.js");
const cookieSession = require("cookie-session");

// Exercise 1.
test("Users who are logged out are redirected to the registration page when they attempt to go to the petition page", () => {
    return supertest(app)
        .get("/petition")
        .then((response) => {
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe("/register");
        });
});

// Exercise 2.
test("Users who are logged in are redirected to the petition page when they attempt to go to the registration page", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
    });
    return supertest(app)
        .get("/register")
        .then((response) => {
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe("/petition");
        });
});

test("Users who are logged in are redirected to the petition page when they attempt to go to the login page", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
    });
    return supertest(app)
        .get("/login")
        .then((response) => {
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe("/petition");
        });
});

// Exercise 3.
test("Users who are logged in and have signed the petition are redirected to the thank you page when they attempt to go to the petition page or submit a signature", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
        sigId: 1,
    });
    return supertest(app)
        .get("/petition")
        .then((response) => {
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe("/thanks");
        });
});

// Exercise 4.
test("Users who are logged in and have not signed the petition are redirected to the petition page when they attempt to go to the thank you page", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
        sigId: undefined,
    });
    return supertest(app)
        .get("/thanks")
        .then((response) => {
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe("/petition");
        });
});

test("Users who are logged in and have not signed the petition are redirected to the petition page when they attempt to go to the signers page", () => {
    cookieSession.mockSessionOnce({
        userId: 1,
        sigId: undefined,
    });
    return supertest(app)
        .get("/signers")
        .then((response) => {
            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toBe("/petition");
        });
});
