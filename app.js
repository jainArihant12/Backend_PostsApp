const express = require('express');
const app = express();
const cookieParser = require('cookie-parser')
const path = require('path')
const userModel = require('./modules/user')
const postModel = require('./modules/post')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const upload= require('./config/multerconfig')



app.set("view engine", "ejs");                      // Telling Express.js to use EJS as the templating engine for rendering dynamic views (HTML pages) on the server side 
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname,"public")))  // necessary to use static file
app.use(express.json());                            // Telling Express to automatically parse incoming JSON data from the request body.
app.use(express.urlencoded({ extended: true }));    //It helps your server read data from HTML forms.true: Allows rich (nested) objects 
app.use(cookieParser());                            // cookie-parser is a middleware for Express.js that helps your app read cookies sent by the browser.



app.get('/', (req, res) => {
    res.render("index.ejs");
})

app.post("/register", async (req, res) => {

    let { name, username, password, age, email } = req.body;

    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send("User already Available")

    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
            let user = await userModel.create({
                name,
                age,
                username,
                email,
                password: hash
            })
            await user.save();

            let token = jwt.sign({ email: email, userid: user._id }, "shhhhh")
            res.cookie("token", token)
           res.redirect('/login');
        });
    });

})

app.get("/profile/test",isLoggedIn, (req, res) => {
    res.render('profileUpload.ejs')
})

app.post("/upload" ,isLoggedIn, upload.single('image') ,async function(req,res){
    
    let user = await userModel.findOne({email:req.user.email})
    user.userpic = req.file.filename;
    await user.save()
    res.redirect('/profile')
})

app.get('/login', (req, res) => {
    res.render("login.ejs");
})

app.post("/login", async (req, res) => {

    let { password, email } = req.body;

    let user = await userModel.findOne({ email });
     if (!user) {
        // User not found
        return res.status(400).send("User not found. Did you register ? , If yes Wrong email / password.");
    }

    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhhh")
            res.cookie("token", token)
            res.status(200).redirect("/profile")
        }
        else res.redirect("/login")
    })
})

app.get('/logout', (req, res) => {
    res.cookie("token", "")
    res.redirect("/login")
})

function isLoggedIn(req, res, next) {
    const token = req.cookies.token;  //Reads the token from the cookies sent by the browser

    if (!token) {
        return res.redirect('/login')
    }

    try {
        const data = jwt.verify(token, "shhhhh");
        req.user = data;
        next(); // If the token is valid, call the next middleware or route.
    } catch (err) {
        return res.send("Invalid or expired token");
    }
}

app.get('/profile', isLoggedIn, async (req, res) => {
    
    let user = await userModel.findOne({ email: req.user.email }).populate("posts")
    
    res.render("profile", { user })
})

app.post("/post", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email })
    let { content } = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile")
})

app.get("/feed", isLoggedIn, async (req, res) => {
    let posts = await postModel.find().populate("user");
    res.render("feed.ejs", { posts , currentUser:req.user });
});

app.get('/Like/:id', isLoggedIn, async (req, res) => {

    let post = await postModel.findOne({ _id: req.params.id }).populate("user")
    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid)
    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1)
    }

    await post.save()
    res.redirect(req.get("referer"));
})

app.get("/edit/:id" , isLoggedIn ,async function(req , res){
    let post = await postModel.findOne({ _id: req.params.id }).populate("user")
    res.render("editpost.ejs", {post})
})
app.get("/delete/:id" , isLoggedIn ,async function(req , res){
    let post = await postModel.findByIdAndDelete({ _id: req.params.id })
    res.redirect('/profile')
    
})

app.post("/update/:id" , isLoggedIn ,async function(req,res){
    let post = await postModel.findOneAndUpdate({_id:req.params.id} , {content:req.body.content})

    res.redirect('/profile')
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});