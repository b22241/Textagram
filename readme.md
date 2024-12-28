# Textagram

Textagram is a web application that allows users to share posts, comment on posts, and create accounts. Built with Node.js, Express.js, MongoDB, and Tailwind CSS for styling, Textagram is a sleek and responsive social platform.

## Features
- **User Authentication**: Users can register, log in, and manage their accounts.
- **Post Management**: Create, delete, and display posts.
- **Comments**: Users can add and delete comments on posts.
- **Responsive Design**: Built with Tailwind CSS to ensure mobile-friendly and responsive UI.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/textagram.git
   cd textagram
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=3000
   MONGODB_URI=<your_mongo_db_connection_string>
   SESSION_SECRET=<your_secret_key>
   ```

4. Run the application:
   ```bash
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Project Structure
- **`views/`**: EJS templates for rendering UI.
- **`routes/`**: Contains all route handlers.
- **`models/`**: Mongoose schemas for database interactions.
- **`public/`**: Static assets (CSS, JS, images).
- **`app.js`**: Entry point for the application.

## Technologies Used
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Frontend**: EJS (Embedded JavaScript) and Tailwind CSS
- **Authentication**: Express-session

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch-name`).
3. Commit your changes (`git commit -m 'Add a new feature'`).
4. Push to the branch (`git push origin feature-branch-name`).
5. Create a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---
Feel free to open an issue if you encounter any bugs or have feature requests!
