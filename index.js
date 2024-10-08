import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";


const app = express();
const PORT = process.env.PORT || 3030;

const db = new pg.Client({
  user: "books_k90e_user",
  host: "dpg-clvlgeta73kc73br3r90-a.oregon-postgres.render.com",
  database: "books_k90e",
  password: "cGzcQRvOBR5PxnXgjvRE8HBQiIR57QGx",
  port: 5432,
  ssl: true,
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
    const userBooks = [];
    result.rows.forEach((bookRow) => {
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
  return userBooks;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
    const novels = await checkRead();

    const currentUser = await getCurrentUser();

    const result = await db.query("SELECT * FROM booklist ORDER BY id ASC");
    book = result.rows;
    const booksToShow = currentUserId === 0 ? book : novels

  res.render("index.ejs", {
  listTitle: "List of Read Books",
  listItems: booksToShow,
  users,
  name: (booksToShow[0] || {}).name,
})


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
  const id = users.length + 1;

  const result = await db.query(
    "INSERT INTO users (id, name, color) VALUES($1, $2, $3) RETURNING *;",
    [id, name, color]
  );

  const userId = result.rows[0].id;
  currentUserId = userId;

  res.redirect("/");
});

app.post("/edit", async (req, res) => {
  const rating = req.body.updatedItemRating;
  const id = req.body.updatedItemId;


  try {
    await db.query("UPDATE booklist SET rating = ($1) WHERE id = $2 AND user_id = $3", [rating, id, currentUserId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;

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



