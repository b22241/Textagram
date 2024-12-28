const express = require('express');
const app = express();
const commentModel = require('./models/comment');
const userModel = require('./models/user');
const postModel = require('./models/post');
const messageModel = require('./models/message'); // Assuming a message schema exists
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const upload = require('./config/multerconfig');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());



// Middleware for checking if user is logged in
function isLoggedIn(req, res, next) {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }

    try {
        let data = jwt.verify(req.cookies.token, 'shhhh'); // Secret key used for signing JWT
        req.user = data; // Attach user data to request
        next();
    } catch (error) {
        console.error('JWT verification failed:', error);
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) =>{
    res.render('login');
})

app.get('/login', (req, res) => {
    res.render('login')
});

app.get('/register', (req, res) =>{
    res.render('index')
});

app.post('/register', async (req, res) => {
    let { email, password, username, name, age } = req.body;
    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send('User already exists');

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let newUser = await userModel.create({ username, email, name, age, password: hash });
            let token = jwt.sign({ email, userid: newUser._id }, 'shhhh');
            res.cookie('token', token);
            res.redirect('/profile');
        });
    });
});

app.get('/profile/upload', (req, res) => {
    res.render('profileupload');
});

app.post('/upload', isLoggedIn, upload.single('image'), async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        user.profilepic = req.file.filename; // Store uploaded file's name in user model
        await user.save(); // Save the updated user
        res.redirect('/profile'); // Redirect to profile route
    } catch (error) {
        console.error(error);
        res.status(500).send("Error uploading profile picture");
    }
});

app.get('/logout', (req, res) => {
    res.cookie('token', '');
    res.redirect('/login');
});

app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        // Fetch the logged-in user's data
        const user = await userModel.findOne({ email: req.user.email }).populate('posts');

        // Fetch all posts, including the author data
        const allPosts = await postModel.find()
            .populate('user', 'name username profilepic') // Populate author details
            .sort({ date: -1 }); // Sort posts by latest

        if (!user) return res.redirect('/login');

        // Fetch all other users for sidebar
        const allUsers = await userModel.find({ _id: { $ne: user._id } });

        res.render('profile', { user, allUsers, allPosts });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Chat Page Route
app.get('/message/:id', isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findById(req.user.userid);
        let allUsers = await userModel.find({ _id: { $ne: user._id } });
        let otherUser = await userModel.findById(req.params.id);
        
        let messages = await messageModel.find({
            $or: [
                { sender: user._id, receiver: otherUser._id },
                { sender: otherUser._id, receiver: user._id }
            ]
        }).sort('createdAt');
        
        res.render('chat', { user, allUsers, otherUser, messages });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
// Send Message Route
app.post('/message/:id', isLoggedIn, async (req, res) => {
    try {
        let sender = req.user.userid; // User sending the message
        let receiver = req.params.id; // ID of the recipient
        let { content } = req.body; // Message content

        // Create a new message in the database
        await messageModel.create({
            sender,
            receiver,
            content,
        });

        // Redirect back to the chat page with the recipient
        res.redirect(`/message/${receiver}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Registration and Login Routes


app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).send('Username or password is incorrect');

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email, userid: user._id }, 'shhhh');
            res.cookie('token', token);
            res.redirect('/profile');
        } else {
            res.redirect('/login');
        }
    });
});


app.post('/post', isLoggedIn, async (req, res) => {
    let { content } = req.body;
    if (!content || content.trim() === '') {
        return res.status(400).send('Post content cannot be empty.');
    }
    try {
        let user = await userModel.findOne({ email: req.user.email });
        if (!user) 
        {
            return res.status(404).send('User not found.');
        }
        let newPost = await postModel.create({ content, user: user._id });
        user.posts.push(newPost._id);
        await user.save();

        res.redirect('/profile');
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send('An error occurred while creating the post.');
    }
});

// GET route for displaying comments on a post
// GET comments for a post
app.get(['/comment/:post_id', '/comments/:post_id'], isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.post_id)
            .populate({
                path: 'comments',
                populate: {
                    path: 'userId',
                    select: 'name username'
                }
            })
            .populate('user', 'name username');

        if (!post) {
            return res.status(404).send('Post not found');
        }

        res.render('comment', { post, user: req.user} );
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// POST route for adding a new comment
app.post('/comment/:post_id', isLoggedIn, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).send('Comment content is required');
        }

        // Find the post
        const post = await postModel.findById(req.params.post_id);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Create a new comment
        const newComment = await commentModel.create({
            content,
            userId: req.user.userid, // Use the logged-in user's ID
            postId: req.params.post_id
        });

        // Add the comment to the post's comments array
        post.comments.push(newComment._id);
        await post.save();

        res.redirect(`/comment/${req.params.post_id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/like/:post_id', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.post_id);
        if (!post) return res.status(404).send('Post not found');

        const userId = req.user.userid;

        // Check if user has already liked the post
        const likeIndex = post.likes.indexOf(userId);

        if (likeIndex === -1) {
            // User has not liked the post, so add the like
            post.likes.push(userId);
        } else {
            // User has already liked the post, so remove the like
            post.likes.splice(likeIndex, 1);
        }

        await post.save();

        res.redirect('/profile'); // Redirect back to the profile page
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/delete/:post_id', isLoggedIn, async (req, res) => {
    try {
        const postId = req.params.post_id;

        // Find the post to ensure it exists and belongs to the logged-in user
        const post = await postModel.findById(postId);
        if (!post) return res.status(404).send('Post not found.');

        // Check if the logged-in user is the author of the post
        if (post.user.toString() !== req.user.userid) {
            return res.status(403).send('You are not authorized to delete this post.');
        }

        // Delete the post
        await postModel.findByIdAndDelete(postId);

        // Remove the post reference from the user's posts array
        await userModel.updateOne(
            { _id: req.user.userid },
            { $pull: { posts: postId } }
        );

        
        res.redirect('/profile'); // Redirect back to the profile page
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/edit/:post_id', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.post_id);
        if (!post) return res.status(404).send('Post not found');

        if (post.user.toString() !== req.user.userid) {
            return res.status(403).send('You are not authorized to edit this post.');
        }

        res.render('editPost', { post });
    } catch (error) {
        console.error('Error fetching post for edit:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST Route to Update Post Content
app.post('/edit/:post_id', isLoggedIn, async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).send('Post content cannot be empty.');
    }

    try {
        const post = await postModel.findById(req.params.post_id);
        if (!post) return res.status(404).send('Post not found');

        if (post.user.toString() !== req.user.userid) {
            return res.status(403).send('You are not authorized to edit this post.');
        }

        post.content = content.trim();
        await post.save();

        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/mypost', isLoggedIn, async (req, res) => {
    try {
        // Fetch the logged-in user with their posts
        let user = await userModel.findOne({ email: req.user.email }).populate('posts');
        if (!user) return res.redirect('/login');
        
        // Fetch all users excluding the logged-in user
        let allUsers = await userModel.find({ _id: { $ne: user._id } });

        // Pass the user and allUsers to the view
        res.render('mypost', { user, allUsers });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// app.get('/post/:postId', isLoggedIn, async (req, res) => {


//     try {
//         let user = await userModel.findById(req.user.userid);
//         let post = await postModel.findById(req.params.postId)
//             .populate('userId', 'name username')
//             .populate({
//                 path: 'comments',
//                 populate: {
//                     path: 'userId',
//                     select: 'name username'
//                 }
//             });

//         res.render('postDetail', { user, post });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// });


// Route to show comments for a specific post

app.get('/editt/:message_id', async (req, res) => {
    try {
        const message = await messageModel.findById(req.params.message_id);
        res.render('editMessage', { message });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to update a message (POST)
app.post('/editt/:message_id', isLoggedIn, async (req, res) => {
    try {
        const { content } = req.body;
        const message = await messageModel.findById(req.params.message_id);

        if (!message || message.sender.toString() !== req.user.userid.toString()) {
            return res.status(403).send('Unauthorized');
        }

        message.content = content;
        await message.save();

        res.redirect(`/message/${message.receiver}`); // Redirect back to the chat
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

