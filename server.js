const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// require('dotenv').config();

const app = express();

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Sets X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // Sets Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

let LOCALDATABASE_URL = process.env.LOCALDATABASE_URL;
let CLOUDDATABASE_URL = process.env.CLOUDDATABASE_URL;
let LOCALHOST_URL = process.env.LOCALHOST_URL;

app.use(cors());

// origins allowed to make an http request to the server
// app.use(
//   cors({
//     // change needed here
//     origin: [`${LOCALHOST_URL}`, 'https://www.netlify.com/'],
//   })
// );

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(CLOUDDATABASE_URL || LOCALDATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  // console.log('Connected to MongoDB');
});

// This is the model for users creating an account on the website. when a user creates an account, their email and uid will be posted to the database. the favorites array will be initially empty, until the user decides to favorite a pet.
const userSchema = new mongoose.Schema({
  email: String,
  uid: {
    type: String,
    unique: true,
  },
  favorites: [
    {
      species: String, //chosenElement.species
      id: Number, // chosenElement.id   we need the id so if the id matches with the chosen element, then we know that the user has favorited the pet
      description: String, // chosenElement.description
      images: [
        {
          small: String,
          medium: String,
          large: String,
          full: String,
        },
      ], // Array of image URLs
      state: String, // chosenElement.State
      email: String, // chosenElement.email
      phone: String,
      city: String, // chosenElement.city
      postedon: String,
      breed: String,
      gender: String,
      age: String, // chosenElement.age
      spayed: String, // chosenElement.attributes.spayed_neutered if its true then neutered will appear
      shots: String, // chosenElement.attributes.shots_current if its true then neutered will appear

      latitude: Number,
      longitude: Number,
    },
  ],
});

const LOCALDATABASE_NAME = process.env.LOCALDATABASE_NAME;
const CLOUDDATABASE_NAME = process.env.CLOUDDATABASE_NAME;

const illupetsuser = mongoose.model(
  `${CLOUDDATABASE_NAME || LOCALDATABASE_NAME}`,
  userSchema
);

// when a user clicks the register button on the register page this route will add the user to the database
app.post('/createuser', async (req, res) => {
  // console.log(req.body);

  // this information will be sent to the database
  const newUser = new illupetsuser({
    email: req.body.email,
    uid: req.body.uid,
    favorites: [],
  });

  try {
    // inserts a document to the MongoDB collection,
    const savedUser = await newUser.save();
    // console.log('User saved:', savedUser);
  } catch (error) {
    console.error('Error saving user:', error);
  }
});

// This route is for when the users clicks the favorites button on the modal to favorite a pet.
app.post('/:uid/addfavorites', async (req, res) => {
  try {
    const { uid } = req.params;
    // console.log(uid, 'uid');
    const { favoriteObject } = req.body;
    // console.log(favoriteObject, 'favobj');

    const user = await illupetsuser.findOneAndUpdate(
      { uid: uid },
      { $push: { favorites: favoriteObject } },
      { new: true } // Returns the modified document after update
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // console.log('added Successfully');
    // User found and favorites array updated
    res
      .status(200)
      .json({ message: 'Pet Added TO Favorites Successfully', user: user });
  } catch (error) {
    console.error('Error adding favorites:', error);
    res.status(500).json({ error: 'Failed to add favorites' });
  }
});

// this route is for when the user already favorited a pet, and then clicks the modal again. it is to ensure if the favorite icon should be outlined or filled.
// to determine if the user already added the pet.// this route is for when the user already favorited a pet, and then clicks the modal again. it is to ensure if the favorite icon should be outlined or filled.
// to determine if the user already added the pet.
app.get('/:uid/findid/:favoriteid', async (req, res) => {
  try {
    const { uid, favoriteid } = req.params;

    // Finds the user by uid
    const user = await illupetsuser.findOne({ uid: uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Search for the favorite with the specified id in the user's favorites array
    const favorite = user.favorites.find((fav) => fav.id == favoriteid);

    if (!favorite) {
      // If favorite is not found, return a 404 error
      return res.status(404).json({ error: 'Favorite not found' });
    }

    // If favorite is found, return the found favorite
    res.status(200).json({ favorite });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/:uid/deletefavorites', async (req, res) => {
  try {
    const { uid } = req.params;
    const { favoriteObject } = req.body;
    // console.log(favoriteObject, 'favobj');
    // Finds the user with the specified uid
    const user = await illupetsuser.findOneAndUpdate(
      { uid: uid }, // Filter criterias based on the uid of the user
      { $pull: { favorites: { id: favoriteObject.id } } }, // Updates operation with condition on favorite id
      { new: true } // Returns the modified document after update
    );
    // console.log(user, 'user');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res
      .status(200)
      .json({ message: 'Pet deleted TO Favorites Successfully', user: user });
  } catch (error) {
    console.error('Error adding favorites:', error);
    res.status(500).json({ error: 'Failed to add favorites' });
  }
});

// this route sends all the favorites of the user to the frontend
app.get('/:uid/favorites', async (req, res) => {
  try {
    const { uid } = req.params;

    // Finds the user by uid
    const user = await illupetsuser.findOne({ uid: uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Sends the entire favorites array to the frontend
    res.status(200).send(user.favorites);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/testing', (req, res) => {
  res.send('testing');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
