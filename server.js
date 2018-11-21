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
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
const port = 3000;

//User Registration
app.post("/register", (req, res) => {
    console.log("Registration request");
    const username = req.body.username;
    const password = req.body.password;

    db.serialize(() => {
        console.log("Serializing database");
        bcrypt.hash(password, 10, (err, hash) => { //Using Bcrypt to hash the user's password
            if(err) {
                console.error(err.message);
            }
            db.run(`INSERT INTO users(name,password_hash) VALUES(?,?)`, [username, hash], (err, userRow) =>{
                console.log("Running INSERT query");
                if(err) {
                    console.error(err.message);
                }
                console.log(`Row inserted at ${userRow.userID}`);
            });
        });
        console.log("Ending serialization");
    });
    res.sendfile(path.join(__dirname + "/public/html/success_page.html"));
});

//User Login
app.post("/login", (req,res) => {
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
                if(result) {
                    db.get(`SELECT userID FROM users WHERE name = ?`, [username], (err, userRow) => {
                        if (err) {
                            console.error(err.message);
                        }
                        sessionToken = uuid();
                        res.cookie('sessionToken', sessionToken);
                        const date = new Date();
                        const timestamp = date.getTime();
                        db.run(`INSERT INTO sessions(userID, sessionToken, timestamp, expired) VALUES(?,?,?,?)`, [userRow.userID, sessionToken, timestamp, false], (sessionErr, sessionRow) => {
                            if(sessionErr) {
                                console.error(sessionErr.message);
                            }
                            //                            console.log(`A row has been inserted at ${sessionRow.sessionID}`);
                            console.log(`A row has been inserted in sessions`);
                        });
                        console.log("After writing to DB")
                    });
                    res.sendFile(path.join(__dirname + "/public/html/index.html"));
                } else {
                    res.sendFile(path.join(__dirname + "/public/html/rejection_page.html")); 
                }
            });
        });
        console.log("Ending serialization")
    });
});

app.post("/postThread", (req,res) => {
    db.serialize(() => {
        //        const data = {data:null};
        //        db.all(`SELECT * FROM users`, [], (err, rows) => {
        //            if(err) {
        //                console.error(err.message);
        //            }
        //            res.send(rows);
        //        });
                db.each(`SELECT count(*) FROM posts WHERE parentThread=1`, [], (err, result) => {
                    if(err){
                        console.error(err.message);
                    }
                    res.send(result);
                    console.log(JSON.parse(result));
                });
    });
    //    console.log("Thread creation request");
    //    var threadID = -1;
    //    db.serialize(() => {
    //        console.log("Serializing database");
    //        const sessionToken = req.cookies.sessionToken;
    //        console.log(sessionToken);
    //        db.get(`SELECT userID FROM sessions WHERE sessionToken = ?`, [sessionToken], (err, row) => {
    //            db.get(`SELECT * FROM users WHERE userID = ?`, [row.userID], (err, usersRow) => {
    //                db.run(`INSERT INTO threads(user,subject,content) VALUES(?,?,?)`, [usersRow.name, req.body.subject, req.body.content], (err) => {
    //                    if(err) {
    //                        console.error(err.message);
    //                    }
    //                    console.log(`A row has been inserted into threads`);
    //                    db.get(`SELECT * FROM threads WHERE subject = ?`, [req.body.subject], (err, threadRow) => {
    //                        if(err) {
    //                            console.error(err.message);
    //                        }
    //                        threadID = threadRow.threadID;
    //                        console.log("Thread ID: " + threadID);
    //                        db.run(`INSERT INTO posts(user,subject,content,parentThread,orderInThread) VALUES(?,?,?,?,1)`, [usersRow.name, req.body.subject, req.body.content, threadID], (err) => {
    //                            if(err) {
    //                                console.error(err.message);
    //                            } 
    //                        });
    //                    });
    //                });
    //            });
    //        });
    //        console.log("Ending serialization")
    //    });
    //    res.sendfile(path.join(__dirname + "/public/html/success_page.html"));
});

app.post("/createPost", (req,res) => {
    console.log("Post creation request");
    var postCount;
    db.serialize(() => {
        console.log("Serializing database");
        const sessionToken = req.cookies.sessionToken;
        console.log(sessionToken);
        db.get(`SELECT userID FROM sessions WHERE sessionToken = ?`, [sessionToken], (err, row) => {
            db.get(`SELECT * FROM users WHERE userID = ?`, [row.userID], (usersErr, usersRow) => {
                if(usersErr) {
                    console.error(usersErr.message);
                }
                db.each(`SELECT count(*) FROM posts WHERE parentThread=1`, [], (err, result) => {
                    if(err){
                        console.error(err.message);
                    }
                    //                    res.send(result);
                    db.run(`INSERT INTO posts(user,subject,content,parentThread) VALUES(?,?,?,?)`, [usersRow.name, req.body.subject, req.body.content, result], (postsErr) => {
                        if(postsErr) {
                            console.error(postsErr.message);
                            res.sendFile(path.join(__dirname + "/public/html/rejection_page.html"));
                        } else {
                            console.log("Post inserted into posts");
                            res.sendFile(path.join(__dirname + "/public/html/success_page.html"));
                        }
                    });
                });
            });
        });
        console.log("Ending serialization")
    });
});

//Serving Index page
app.get("/", (req,res) => {
    console.log("Index request");
    const uniqueId = uuid();
    res.sendFile(path.join(__dirname + "/public/html/index.html"));
});

app.get("/forums.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/forum.html"));
    var markup = "";
});

app.get("/displayForums", (req,res) => {
    db.serialize(() => {
        console.log("Serializing database");
        db.each(`SELECT * FROM threads WHERE user = ?`,['topo'], (err, row) => {
            if(err) {
                console.error(err.message);
            }
            console.log(JSON.stringify(rows));
        });
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

app.get("/login.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/login.html"));
});

app.get("/posts.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/posts.html"));
});

//Listening on port 3000 for traffic
app.listen(port, (err) => {
    if(err) {
        console.error(err.message);
    }
    console.log(`Server is listening on ${port}`)
});
