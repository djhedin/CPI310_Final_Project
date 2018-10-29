//Required packages

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');

//Setting up Express
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
const port = 3000;

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
                console.log('A row has been inserted');
            });
            db.close();
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
    var login_success;
    let db = new sqlite3.Database('./data/userbase.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the userbase');
    });

    /*db.serialize(() => {
        let sql = `SELECT password_hash FROM users WHERE name = ?`;

        db.each(sql, [username], (err, row) => {
            if (err) {
                console.error(err.message);
            }
            bcrypt.compare(password, row.password_hash, function(err, res) {
                console.log(res);
                return res;
            });
        });
    });*/

    let sql = `SELECT password_hash FROM users WHERE name = ?`;

    db.each(sql, [username], (err, row) => {
        if (err) {
            console.error(err.message);
        }
        bcrypt.compare(password, row.password_hash, function(err, res) {
            console.log(res)
            if(res) {
                res.sendFile(path.join(__dirname + "/public/html/success_page.html")); 
            } else {
                res.sendFile(path.join(__dirname + "/public/html/rejection_page.html")); 
            }
        });
    });

    /*console.log(login_success);
    if(login_success == true) {
        res.sendFile(path.join(__dirname + "/public/html/success_page.html")); 
    } else {
        res.sendFile(path.join(__dirname + "/public/html/rejection_page.html")); 
    }*/
});

//Serving Index page
app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/index.html"));
});

//Serving Registration page
app.get("/registration.html", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/registration.html"));
});

//Serving Success landing page
app.get("/success", (req,res) => {
    res.sendFile(path.join(__dirname + "/public/html/success_page.html"));
});

//Listening on port 3000 for traffic
app.listen(port, (err) => {
    if(err) {
        console.error(err.message);
    }
    console.log(`Server is listening on ${port}`)
});
