const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");


const app = express();


connectDB();  


app.use(express.json());
app.use(cors());


app.use("/api/auth", require("./routes/auth"));

app.get("/", (req, res) => res.send("API Running..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;