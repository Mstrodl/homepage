const blocks = [
  // Square
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  // Squiggle
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
  ],
  // Line
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  // Hook
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
  ],
  // Chode piece
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
];
const SCALE = 32;
const PALETTE = [
  "hsl(120,100%,28%)",
  "hsl(120,100%,32%)",
  "hsl(120,100%,36%)",
  "hsl(120,100%,18%)",
  "hsl(120,100%,24%)",
  "hsl(120,100%,30%)",
  "hsl(120,100%,44%)",
];
const linePoints = [0, 40, 100, 300, 1200];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function run() {
  let running = true;
  let rows;
  let score = 0;
  const scoreElement = document.getElementById("tetris-score");
  const tetris = document.getElementById("tetris-bg");

  const board = document.createElement("ol");
  const gameOver = document.createElement("div");
  gameOver.className = "modal game-over";
  const gameOverText = document.createElement("h2");
  gameOverText.textContent = "Game Over!";
  gameOver.appendChild(gameOverText);
  gameOver.appendChild(board);

  const pause = document.createElement("div");
  pause.className = "modal pause";
  const pauseContent = document.createElement("h2");
  pauseContent.textContent = "Press any key to continue.";
  pause.appendChild(pauseContent);
  document.body.appendChild(pause);

  let resKillSwitch = null;
  let killSwitchPromise = null;
  function setupKillSwitch() {
    killSwitchPromise = new Promise((res) => {
      resKillSwitch = res;
    });
  }
  function killSwitch() {
    running = false;
    resKillSwitch();
    setupKillSwitch();
    scoreElement.textContent = "";
    score = 0;
  }
  setupKillSwitch();

  let resizeTimer = null;
  function onResize() {
    if (resizeTimer) return;
    killSwitch();
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      rows = [];
      // TODO: Listen for resize
      tetris.width = window.innerWidth;
      tetris.height = window.innerHeight;
      if (tetris.width < 800) {
        return;
      }
      running = true;
      for (let y = 0; y < Math.floor(tetris.height / SCALE); ++y) {
        const row = new Array(Math.floor(tetris.width / SCALE)).fill(null);
        rows.push(row);
      }

      doTetris();
    });
  }
  window.addEventListener("resize", onResize);
  document.body.appendChild(pause);
  function unpause(event) {
    pause.remove();
    event.preventDefault();
    onResize();
    document.removeEventListener("keydown", unpause);
  }
  document.addEventListener("keydown", unpause);

  const ctx = tetris.getContext("2d");

  async function doTetris() {
    const bag = shuffle(new Array(blocks.length).fill(null).map((_, i) => i));

    let turn = 0;
    while (running) {
      if (turn >= bag.length) {
        turn = 0;
        shuffle(bag);
      }
      const blockIndex = bag[turn++];
      let block = blocks[blockIndex];

      let posY = Math.floor(tetris.height / SCALE) - 5;
      let posX = Math.floor(Math.floor(tetris.width / SCALE) / 2);

      function set(value) {
        for (const [y, x] of block) {
          const targetX = posX + x;
          const targetY = posY + y;
          rows[targetY][targetX] = value;
        }
      }

      function check() {
        for (const [y, x] of block) {
          const targetX = posX + x;
          const targetY = posY + y;
          if (!rows[targetY] || rows[targetY][targetX] !== null) {
            return false;
          }
        }
        return true;
      }

      if (!check()) {
        setTimeout(async () => {
          document.body.appendChild(gameOver);

          await fetch(
            (location.hostname == "localhost" ? "http://localhost:3000/" : "") +
              "scoreboard",
            {
              method: "PUT",
              body: score,
            }
          );
          const scores = await fetch("scoreboard.json").then((res) =>
            res.json()
          );

          let max = 0;
          for (const score of scores) {
            const scoreString = score.score.toString();
            if (max < scoreString.length) {
              max = scoreString.length;
            }
          }

          for (const score of scores) {
            const scoreElem = document.createElement("li");
            scoreElem.textContent =
              score.user.padEnd(max, " ") + " - " + score.score;
            board.appendChild(scoreElem);
          }
        });
        return;
      }

      while (running) {
        let outerHandle = null;

        let timeout = null;
        let triggered = false;
        const result = await Promise.race([
          new Promise((res) => (timeout = setTimeout(res, 250))).then(() => {
            set(null);
            --posY;
            if (!check()) {
              ++posY;
              set(blockIndex);
              return true;
            } else {
              set(blockIndex);
            }
          }),

          new Promise((res) => {
            function handle(event) {
              if (event.key == "ArrowLeft") {
                event.preventDefault();
                set(null);
                --posX;
                if (!check()) {
                  ++posX;
                  set(blockIndex);
                } else {
                  set(blockIndex);
                  res();
                }
              } else if (event.key == "ArrowUp") {
                event.preventDefault();
                set(null);
                const oldBlock = block;
                block = [];
                block[0] = [-oldBlock[0][1], oldBlock[0][0]];
                block[1] = [-oldBlock[1][1], oldBlock[1][0]];
                block[2] = [-oldBlock[2][1], oldBlock[2][0]];
                block[3] = [-oldBlock[3][1], oldBlock[3][0]];
                if (!check()) {
                  block = oldBlock;
                  set(blockIndex);
                } else {
                  set(blockIndex);
                  res();
                }
              } else if (event.key == "ArrowRight") {
                event.preventDefault();
                set(null);
                ++posX;
                if (!check()) {
                  --posX;
                  set(blockIndex);
                } else {
                  set(blockIndex);
                  res();
                }
              } else if (event.key == "ArrowDown") {
                event.preventDefault();
                set(null);
                --posY;
                if (!check()) {
                  ++posY;
                  set(blockIndex);
                  res(true);
                } else {
                  set(blockIndex);
                  res();
                  ++score;
                }
              }
            }
            document.addEventListener("keydown", handle);
            outerHandle = handle;
          }),
          killSwitchPromise,
        ]);
        triggered = true;

        document.removeEventListener("keydown", outerHandle);
        clearTimeout(timeout);

        ctx.fillStyle = "transparent";
        ctx.clearRect(0, 0, tetris.width, tetris.height);
        if (!running) return;
        for (const y in rows) {
          for (const x in rows[y]) {
            const chunk = rows[y][x];
            const color = PALETTE[chunk];
            if (chunk !== null) {
              ctx.fillStyle = color;
              const posY = tetris.height - y * SCALE - SCALE;
              ctx.fillRect(x * SCALE, posY, SCALE, SCALE);
            }
          }
        }
        // debugger;
        if (result === true) {
          break;
        }
      }
      let lines = 0;
      let done = false;
      while (!done) {
        for (const y in rows) {
          if (y == rows.length - 1) {
            done = true;
          }
          const oldRow = rows[y];
          if (oldRow.find((item) => item === null) === null) {
            continue;
          }
          ++lines;
          rows.splice(y, 1);
          rows.push(new Array(oldRow.length).fill(null));
          break;
        }
      }
      score += linePoints[lines];
      scoreElement.textContent = score;
    }
  }
}

if (document.readyState == "complete" || document.readyState == "interactive") {
  run();
} else {
  window.addEventListener("DOMContentLoaded", run);
}
