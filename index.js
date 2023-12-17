import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";


const app = express();
const PORT = process.env.PORT || 3030;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "ScootandRocks",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let book = [];

let currentUserId = 1;

let users = [{ id: 1, name: "Roxy", color: "green" }];

async function checkRead() {
  const result = await db.query(
    "SELECT * FROM users JOIN booklist ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
    );
    console.log('roxtest', result);
    const userBooks = [];
    result.rows.forEach((bookRow) => {
      console.log('heyyyyy', bookRow);
      const dataObjReturned = {
        id: bookRow.id,
        title: bookRow.title,
        author_name: bookRow.author_name,
        rating: bookRow.rating,
        cover: bookRow.cover,
        user_id: bookRow.user_id,
        name: bookRow.name,
        color: bookRow.color
      }
      userBooks.push(dataObjReturned)
  });
  console.log('roxy123', userBooks);
  return userBooks;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  console.log('scotttest, currentUserId', currentUserId)
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
    const novels = await checkRead();

    console.log('anyone home?', novels)
    const currentUser = await getCurrentUser();

    const result = await db.query("SELECT * FROM booklist ORDER BY id ASC");
    book = result.rows;
    const booksToShow = currentUserId === 0 ? book : novels
    console.log('what', booksToShow);

  res.render("index.ejs", {
  listTitle: "List of Read Books",
  listItems: booksToShow,
  users,
  name: booksToShow[0].name,
});


    console.log('okay', book);
});

app.post("/add", async (req, res) => {
  const bookEntry = req.body["book"];
  const apiKey = "AIzaSyCblU1UsM9ba_tqtUmhRWn4O-digYNPK14";

  try {
    const getBooks = await axios.get(encodeURI(`https://www.googleapis.com/books/v1/volumes?q=${bookEntry}&key=${apiKey}`))
    .then((result) => {
      console.log('roxytest data', result.data.items);
      return result.data.items[0];
    });

      const title = getBooks.volumeInfo.title
      const authors = getBooks.volumeInfo.authors[0];
      const cover = getBooks.volumeInfo.imageLinks.thumbnail;

      console.log({title, authors})
      

      await db.query("INSERT INTO booklist (title, author_name, cover, user_id) VALUES ($1, $2, $3, $4)", [title, authors, cover, currentUserId]);
      res.redirect("/");
  } catch (err){
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

app.post("/edit", async (req, res) => {
  const rating = req.body.updatedItemRating;
  const id = req.body.updatedItemId;
  console.log('itemupdate', id);
  console.log(rating);
  console.log("currentuser123", currentUserId);

  try {
    await db.query("UPDATE booklist SET rating = ($1) WHERE id = $2 AND user_id = $3", [rating, id, currentUserId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;
  console.log("deleteuser123", currentUserId);
  console.log('itemdeleted', id);
  try {
    await db.query("DELETE FROM booklist WHERE id = $1 AND user_id = $2", [id, currentUserId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



