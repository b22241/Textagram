const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'post', required: true }, // Linking to Post model
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // Linking to User model
    content: { type: String, required: true } // Content of the comment
});

module.exports = mongoose.model('comment', commentSchema);
