const polka = require("polka");
const fs = require("fs");
const bodyParser = require("body-parser");

const scores = JSON.parse(fs.readFileSync("../scoreboard.json"));

polka()
  .use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:2015");
    res.setHeader("Access-Control-Allow-Methods", "PUT");
    if (req.method == "OPTIONS") {
      res.statusCode = 204;
      res.end(null);
    } else {
      next();
    }
  })
  .put("/scoreboard", bodyParser.text(), async (req, res) => {
    if (isNaN(req.body)) {
      res.statusCode = 415;
      res.end("Please don't cheat");
      return;
    }
    const user = req.headers["user-agent"].slice(0, 128);

    let inserted = false;
    for (const index in scores) {
      const score = scores[index].score;
      if (req.body > score) {
        scores.splice(index, 0, {score: req.body, user});
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      scores.push({
        score: req.body,
        user,
      });
    }

    await fs.promises.writeFile("../scoreboard.json", JSON.stringify(scores));

    res.statusCode = 204;
    res.end(null);
  })
  .listen(3000);
