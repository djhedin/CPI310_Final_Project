//Required packages
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const FileStore = require('session-file-store')(session);
let db = new sqlite3.Database('./data/userbase.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database with READWRITE permissions...');
});

//Setting up Express
const app = express();
// app.use(express.static('public'));
app.use(express.static('views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('views', './views')
app.set('view engine', 'twig')
const port = 3000;

//User Registration
app.post("/register", (req, res) => {
    console.log("Registration request");
    const username = req.body.username;
    const password = req.body.password;

    db.serialize(() => {
        console.log("Serializing database");
        bcrypt.hash(password, 10, (err, hash) => { //Using Bcrypt to hash the user's password
            if (err) {
                console.error(err.message);
            }
            db.run(`INSERT INTO users(name,password_hash) VALUES(?,?)`, [username, hash], (err, userRow) => {
                console.log("Running INSERT query");
                if (err) {
                    console.error(err.message);
                }
                // console.log(`Row inserted at ${userRow.userID}`);
            });
        });
        console.log("Ending serialization");
    });
    // res.sendfile(path.join(__dirname + "/public/html/success_page.html"));
    res.redirect("/");
});

//User Login
app.post("/login", (req, res) => {
    console.log("Login request");
    const username = req.body.username;
    const password = req.body.password;

    db.serialize(() => {
        console.log("Serializing database");
        let sql = `SELECT password_hash FROM users WHERE name = ?`;

        db.each(sql, [username], (err, row) => {
            if (err) {
                console.error(err.message);
            }
            bcrypt.compare(password, row.password_hash, (err, result) => {
                console.log("Passwords Match: " + result);
                if (result) {
                    db.get(`SELECT userID FROM users WHERE name = ?`, [username], (err, userRow) => {
                        if (err) {
                            console.error(err.message);
                        }
                        sessionToken = uuid();
                        res.cookie('sessionToken', sessionToken);
                        res.render("index",{});
                        const date = new Date();
                        const timestamp = date.getTime();
                        db.run(`INSERT INTO sessions(userID, sessionToken, timestamp, expired) VALUES(?,?,?,?)`, [userRow.userID, sessionToken, timestamp, false], (sessionErr, sessionRow) => {
                            if (sessionErr) {
                                console.error(sessionErr.message);
                            }
                            //                            console.log(`A row has been inserted at ${sessionRow.sessionID}`);
                            console.log(`A row has been inserted in sessions`);
                        });
                        console.log("After writing to DB")
                    });
                    // res.sendFile(path.join(__dirname + "/public/html/index.html"));
                } else {
                    // res.sendFile(path.join(__dirname + "/public/html/rejection_page.html"));
                }
                // res.redirect("/");
            });
        });
        console.log("Ending serialization")
    });
});

app.post("/postThread", (req, res) => {
    db.serialize(() => {
        console.log("Thread creation request");
        var threadID = -1;
        db.serialize(() => {
            console.log("Serializing database");
            const sessionToken = req.cookies.sessionToken;
            console.log(sessionToken);
            db.get(`SELECT userID FROM sessions WHERE sessionToken = ?`, [sessionToken], (err, row) => {
                db.get(`SELECT * FROM users WHERE userID = ?`, [row.userID], (err, usersRow) => {
                    db.run(`INSERT INTO threads(user,subject,content) VALUES(?,?,?)`, [usersRow.name, req.body.subject, req.body.content], (err) => {
                        if (err) {
                            console.error(err.message);
                        }
                        console.log(`A row has been inserted into threads`);
                        db.get(`SELECT * FROM threads WHERE subject = ?`, [req.body.subject], (err, threadRow) => {
                            if (err) {
                                console.error(err.message);
                            }
                            threadID = threadRow.threadID;
                            console.log("Thread ID: " + threadID);
                            db.run(`INSERT INTO posts(user,subject,content,parentThread,orderInThread) VALUES(?,?,?,?,1)`, [usersRow.name, req.body.subject, req.body.content, threadID], (err) => {
                                if (err) {
                                    console.error(err.message);
                                }
                            });
                        });
                    });
                });
            });
            console.log("Ending serialization")
        });
        // res.sendfile(path.join(__dirname + "/public/html/success_page.html"));
        res.redirect("/displayForums");
    });
});

app.post("/createPost", (req, res) => {
    var parentThread = req.body.parentThread;
    console.log("Post creation request");
    var postCount;
    db.serialize(() => {
        console.log("Serializing database");
        const sessionToken = req.cookies.sessionToken;
        console.log(sessionToken);
        db.get(`SELECT userID FROM sessions WHERE sessionToken = ?`, [sessionToken], (err, row) => {
            db.get(`SELECT * FROM users WHERE userID = ?`, [row.userID], (usersErr, usersRow) => {
                if (usersErr) {
                    console.error(usersErr.message);
                }
                db.each(`SELECT count(*) FROM posts WHERE parentThread=?`, [parentThread], (err, result) => {
                    if (err) {
                        console.error(err.message);
                    }
                    console.log(result);
                    db.run(`INSERT INTO posts(user,subject,content,parentThread, orderInThread) VALUES(?,?,?,?,?)`, [usersRow.name, req.body.subject, req.body.content, parentThread, result['count(*)'] + 1], (postsErr) => {
                        if (postsErr) {
                            console.error(postsErr.message);
                        } else {
                            console.log("Post inserted into posts");
                        }
                        res.redirect(`/displayPosts?id=${parentThread}`);
                    });
                });
            });
        });
        console.log("Ending serialization")
    });
});

//Serving Index page
app.get("/", (req, res) => {
    console.log("Index request");
    res.render('index', {});
});
app.get("/index", (req, res) => {
    console.log("Index request");
    res.redirect("/");
});

// app.get("/forums.html", (req, res) => {
//     res.sendFile(path.join(__dirname + "/public/html/forum.html"));
//     var markup = "";
// });

//Dispaly current threads
app.get("/displayForums", async (req, res) => {
    console.log("Display Forums request");
    db.serialize(() => {
        console.log("Serializing database");
        db.all(`SELECT * FROM threads`, [], (err, rows) => {
            console.log("Selecting from db");
            if (err) {
                console.error(err.message);
            }
            console.log("Sending file");
            // res.render('forums', { rows });
            res.render('wip', { rows });            
        });
    });
});

//Displaying current posts for a given thread
app.get("/displayPosts", async (req,res) => {
    console.log("Display Posts request");
    const threadID = req.param('id');
    console.log(req.params);
    console.log(threadID);
    db.serialize(() => {
        console.log("Serializing database");
        db.all(`SELECT * FROM posts WHERE parentThread=?`, [threadID], (err, rows) => {
            console.log("Selecting from db");
            if (err) {
                console.error(err.message);
            }
            // forumDB.push(rows);

            console.log("Sending file");
            console.log(rows);
            // console.log(forumDB);
            // res.render('posts', { rows });
            res.render('wip2', { rows });
        });
    });
});

// app.get("/displayThread", (req, res) => {
//     const threadID = req.body.threadID;
//     db.serialize(() => {
//         console.log("Serializing database");
//         db.all(`SELECT * FROM posts WHERE parentThread=?`, [threadID], (err, rows) => {
//             console.log("Selecting from db");
//             if (err) {
//                 console.error(err.message);
//             }
//             console.log("Sending file");
//             res.render('forums', { rows });
//         });
//     });
// });

//Serving about page
app.get("/about", (req, res) => {
    console.log("About request");
    res.render('about', {});
});

app.get("/specifications", (req, res) => {
    console.log("Specifications request");
    res.render('specifications', {});
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname + "/public/html/login.html"));
});

//Serving Advocates page
app.get("/advocates", (req, res) => {
    console.log("Advocates request");
    res.render('advocates', {});
});

//Serving Atmosphere page
app.get("/atmosphere", (req, res) => {
    console.log("Atmosphere request");
    res.render('atmosphere', {});
});

//Serving Centrists page
app.get("/centrists", (req, res) => {
    console.log("Centrists request");
    res.render('centrists', {});
});

//Serving Dust page
app.get("/dust", (req, res) => {
    console.log("Dust request");
    res.render('dust', {});
});

//Serving Five Dangers page
app.get("/five_dangers", (req, res) => {
    console.log("Five Dangers request");
    res.render('five_dangers', {});
});

//Serving Freezing page
app.get("/freezing", (req, res) => {
    console.log("Freezing request");
    res.render('freezing', {});
});

//Serving Naysayers page
app.get("/naysayers", (req, res) => {
    console.log("Naysayers request");
    res.render('naysayers', {});
});

//Serving Pressure page
app.get("/pressure", (req, res) => {
    console.log("Pressure request");
    res.render('pressure', {});
});

//Serving Radiation page
app.get("/radiation", (req, res) => {
    console.log("Radiation request");
    res.render('radiation', {});
});

app.get("/registration", (req, res) => {
    res.render("registration", {});
});

//Listening on port 3000 for traffic
app.listen(port, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log(`Server is listening on ${port}`)
});