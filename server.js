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

//Setting up Express
const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
//app.use(expressSession({secret: "secret"}));
const port = 3000;

//Creating User Session
//app.use(session({
//    genid: (req) => {
//        console.log('Inside the session middleware')
//        console.log(req.sessionID)
//        return uuid() // use UUIDs for session IDs
//    },
//    store: new FileStore(),
//    secret: 'topsecret',
//    resave: false,
//    saveUninitialized: true
//}));

//User Registration
app.post("/register", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let db = new sqlite3.Database('./data/userbase.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the userbase');
    });
    db.serialize(() => {
        bcrypt.hash(password, 10, (err, hash) => { //Using Bcrypt to hash the user's password
            if(err) {
                console.error(err.message);
            }
            db.run(`INSERT INTO users(name,password_hash) VALUES(?,?)`, [username, hash], function(err){
                if(err) {
                    console.error(err.message);
                }
                console.log(`A row has been inserted at ${row.id}`);
            });
//            db.close();
        });
    });
    console.log(username);
    console.log(password);
    res.sendfile(path.join(__dirname + "/public/html/success_page.html"));
});
//User Login
app.post("/login", (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    let db = new sqlite3.Database('./data/userbase.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the userbase');
    });

    db.serialize(() => {
        let sql = `SELECT password_hash FROM users WHERE name = ?`;

        db.each(sql, [username], (err, row) => {
            if (err) {
                console.error(err.message);
            }
            bcrypt.compare(password, row.password_hash, (err, result) => {
                console.log("Passwords Match: " + result);
                if(result) {
                    db.get(`SELECT id FROM users WHERE name = ?`, [username], (err, row) => {
                        if (err) {
                            console.error(err.message);
                        }
                        sessionToken = uuid();
                        res.cookie('sessionToken', sessionToken);
                        console.log("Before writing to DB");
                        db.run(`INSERT INTO sessions(userID, sessionToken) VALUES(?,?)`, [row.id, sessionToken], (err2, row2) => {
                            if(err2) {
                                console.error(err2.message);
                            }
                            console.log(`A row has been inserted at ${row.id}`);
                        });
                        console.log("After writing to DB")
                    });
                    res.sendFile(path.join(__dirname + "/public/html/success_page.html"));
                } else {
                    res.sendFile(path.join(__dirname + "/public/html/rejection_page.html")); 
                }
            });
        });
//        db.close();
    });
});

app.post("/postThread", (req,res) => {
    console.log("Opening DB...");
    let db = new sqlite3.Database('./data/userbase.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the userbase');
    });
    db.serialize(() => {
        console.log("seializing db");
        const sessionToken = req.cookies.sessionToken;
        console.log(sessionToken);
        db.get(`SELECT userID FROM sessions WHERE sessionToken = ?`, [sessionToken], (err, row) => {
            db.get(`SELECT * FROM users WHERE id = ?`, [row.userID], (err, newRow) => {
                db.run(`INSERT INTO threads(user,subject,content) VALUES(?,?,?)`, [newRow.name, req.body.subject, req.body.content], function(err){
                    if(err) {
                        console.error(err.message);
                    }
                    console.log(`A row has been inserted into threads`);
                });
            });
        });
//        db.close();
    });
    res.sendfile(path.join(__dirname + "/public/html/success_page.html"));
});

//Serving Index page
app.get("/", (req,res) => {
    const uniqueId = uuid();
    console.log('Inside the homepage callback function')
    console.log(req.sessionID)
    //    res.send('Hit home page.');
    res.sendFile(path.join(__dirname + "/public/html/index.html"));
});
app.get("/forums.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/forums.html"));
    var markup = "";
    let db = new sqlite3.Database('./data/userbase.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the userbase');
    });

    db.serialize(() => {
        db.each(`SELECT * FROM threads(subject,content)`,[], (err, rows) => {
            if(err) {
                console.error(err.message);
            }
        });
//        db.close();
    });
});


app.get("/index.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/index.html"));
});
app.get("/about.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/about.html"));
});
app.get("/plan.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/plan.html"));
});
app.get("/project.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/project.html"));
});
app.get("/specifications.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/specifications.html"));
});
//Serving Registration page
app.get("/registration.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/registration.html"));
});
app.get("/login.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/login.html"));
});

//Listening on port 3000 for traffic
app.listen(port, (err) => {
    if(err) {
        console.error(err.message);
    }
    console.log(`Server is listening on ${port}`)
});
