const mongoose = require('mongoose');
require("dotenv").config();


mongoose.connect( process.env.MONGO_URI ).then(() => { console.log("DB Connected") })
    .catch((error) => console.log(error))

const userSchema = mongoose.Schema({
    username: String,
    name: String,
    age:Number,
    email:String,
    password:String,
    userpic:{
        type:String,
        default:"default.png"
    },
    posts:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"post"
        }
    ]
})

module.exports = mongoose.model('user', userSchema);