import React, { useEffect, useMemo, useState } from "react";
import "../assets/Chess.css";


const GLYPH = {
  w: {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙",
  },
  b: {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟",
  },
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/* =====================================================
   BOARD
===================================================== */

function initialBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];

  for (let f = 0; f < 8; f++) {
    board[0][f] = {
      type: back[f],
      color: "w",
    };

    board[1][f] = {
      type: "p",
      color: "w",
    };

    board[6][f] = {
      type: "p",
      color: "b",
    };

    board[7][f] = {
      type: back[f],
      color: "b",
    };
  }

  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function inBounds(r, f) {
  return r >= 0 && r < 8 && f >= 0 && f < 8;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];

      if (piece && piece.type === "k" && piece.color === color) {
        return [r, f];
      }
    }
  }

  return null;
}

/* =====================================================
   CHECK
===================================================== */

function isSquareAttacked(board, r, f, byColor) {
  const pawnRow = r + (byColor === "w" ? 1 : -1);

  for (const pf of [f - 1, f + 1]) {
    if (!inBounds(pawnRow, pf)) continue;

    const piece = board[pawnRow][pf];

    if (piece && piece.color === byColor && piece.type === "p") {
      return true;
    }
  }

  const knightOffsets = [
    [1, 2],
    [2, 1],
    [-1, 2],
    [-2, 1],
    [1, -2],
    [2, -1],
    [-1, -2],
    [-2, -1],
  ];

  for (const [dr, df] of knightOffsets) {
    const rr = r + dr;
    const ff = f + df;

    if (!inBounds(rr, ff)) continue;

    const piece = board[rr][ff];

    if (piece && piece.color === byColor && piece.type === "n") {
      return true;
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (dr === 0 && df === 0) continue;

      const rr = r + dr;
      const ff = f + df;

      if (!inBounds(rr, ff)) continue;

      const piece = board[rr][ff];

      if (piece && piece.color === byColor && piece.type === "k") {
        return true;
      }
    }
  }

  const straight = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const [dr, df] of straight) {
    let rr = r + dr;
    let ff = f + df;

    while (inBounds(rr, ff)) {
      const piece = board[rr][ff];

      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === "r" || piece.type === "q")
        ) {
          return true;
        }

        break;
      }

      rr += dr;
      ff += df;
    }
  }

  const diagonal = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (const [dr, df] of diagonal) {
    let rr = r + dr;
    let ff = f + df;

    while (inBounds(rr, ff)) {
      const piece = board[rr][ff];

      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === "b" || piece.type === "q")
        ) {
          return true;
        }

        break;
      }

      rr += dr;
      ff += df;
    }
  }

  return false;
}

function isInCheck(board, color) {
  const king = findKing(board, color);

  if (!king) return false;

  return isSquareAttacked(board, king[0], king[1], color === "w" ? "b" : "w");
}

/* =====================================================
   MOVES
===================================================== */

function pieceMoves(board, r, f, state) {
  const piece = board[r][f];

  if (!piece) return [];

  const color = piece.color;
  const moves = [];

  const push = (rr, ff, extra = {}) => {
    moves.push({
      from: [r, f],
      to: [rr, ff],
      ...extra,
    });
  };

  /* PAWN */

  if (piece.type === "p") {
    const dir = color === "w" ? 1 : -1;

    const start = color === "w" ? 1 : 6;

    const promo = color === "w" ? 7 : 0;

    if (inBounds(r + dir, f) && !board[r + dir][f]) {
      if (r + dir === promo) {
        push(r + dir, f, {
          promotion: true,
        });
      } else {
        push(r + dir, f);
      }

      if (r === start && !board[r + dir * 2][f]) {
        push(r + dir * 2, f, {
          double: true,
        });
      }
    }

    for (const df of [-1, 1]) {
      const rr = r + dir;
      const ff = f + df;

      if (!inBounds(rr, ff)) continue;

      const target = board[rr][ff];

      if (target && target.color !== color) {
        push(rr, ff, {
          capture: true,
          promotion: rr === promo,
        });
      } else if (
        state.enPassant &&
        state.enPassant[0] === rr &&
        state.enPassant[1] === ff
      ) {
        push(rr, ff, {
          capture: true,
          enPassant: true,
        });
      }
    }
  }

  /* KNIGHT */

  if (piece.type === "n") {
    const offsets = [
      [1, 2],
      [2, 1],
      [-1, 2],
      [-2, 1],
      [1, -2],
      [2, -1],
      [-1, -2],
      [-2, -1],
    ];

    for (const [dr, df] of offsets) {
      const rr = r + dr;
      const ff = f + df;

      if (!inBounds(rr, ff)) continue;

      const target = board[rr][ff];

      if (!target) {
        push(rr, ff);
      } else if (target.color !== color) {
        push(rr, ff, {
          capture: true,
        });
      }
    }
  }

  /* BISHOP / ROOK / QUEEN */

  if (piece.type === "b" || piece.type === "r" || piece.type === "q") {
    let dirs = [];

    if (piece.type === "b") {
      dirs = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
    }

    if (piece.type === "r") {
      dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
    }

    if (piece.type === "q") {
      dirs = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
    }

    for (const [dr, df] of dirs) {
      let rr = r + dr;
      let ff = f + df;

      while (inBounds(rr, ff)) {
        const target = board[rr][ff];

        if (!target) {
          push(rr, ff);
        } else {
          if (target.color !== color) {
            push(rr, ff, {
              capture: true,
            });
          }

          break;
        }

        rr += dr;
        ff += df;
      }
    }
  }

  /* KING */

  if (piece.type === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let df = -1; df <= 1; df++) {
        if (dr === 0 && df === 0) {
          continue;
        }

        const rr = r + dr;
        const ff = f + df;

        if (!inBounds(rr, ff)) continue;

        const target = board[rr][ff];

        if (!target) {
          push(rr, ff);
        } else if (target.color !== color) {
          push(rr, ff, {
            capture: true,
          });
        }
      }
    }

    const rank = color === "w" ? 0 : 7;

    if (r === rank && f === 4 && !isInCheck(board, color)) {
      const enemy = color === "w" ? "b" : "w";

      /* KING SIDE */

      const kingSide = color === "w" ? state.castling.wK : state.castling.bK;

      if (
        kingSide &&
        !board[rank][5] &&
        !board[rank][6] &&
        board[rank][7]?.type === "r" &&
        board[rank][7]?.color === color &&
        !isSquareAttacked(board, rank, 5, enemy) &&
        !isSquareAttacked(board, rank, 6, enemy)
      ) {
        push(rank, 6, {
          castle: "K",
        });
      }

      /* QUEEN SIDE */

      const queenSide = color === "w" ? state.castling.wQ : state.castling.bQ;

      if (
        queenSide &&
        !board[rank][1] &&
        !board[rank][2] &&
        !board[rank][3] &&
        board[rank][0]?.type === "r" &&
        board[rank][0]?.color === color &&
        !isSquareAttacked(board, rank, 3, enemy) &&
        !isSquareAttacked(board, rank, 2, enemy)
      ) {
        push(rank, 2, {
          castle: "Q",
        });
      }
    }
  }

  return moves;
}

function applyMove(board, mv) {
  const copy = cloneBoard(board);

  const [fr, ff] = mv.from;

  const [tr, tf] = mv.to;

  const piece = copy[fr][ff];

  copy[tr][tf] = piece;
  copy[fr][ff] = null;

  if (mv.enPassant) {
    const capR = piece.color === "w" ? tr - 1 : tr + 1;

    copy[capR][tf] = null;
  }

  if (mv.castle === "K") {
    copy[fr][5] = copy[fr][7];

    copy[fr][7] = null;
  }

  if (mv.castle === "Q") {
    copy[fr][3] = copy[fr][0];

    copy[fr][0] = null;
  }

  return copy;
}

function legalMoves(board, r, f, state) {
  const piece = board[r][f];

  if (!piece) return [];

  return pieceMoves(board, r, f, state).filter((mv) => {
    const next = applyMove(board, mv);

    return !isInCheck(next, piece.color);
  });
}

function allLegalMoves(board, color, state) {
  const result = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];

      if (!piece || piece.color !== color) {
        continue;
      }

      result.push(...legalMoves(board, r, f, state));
    }
  }

  return result;
}

/* =====================================================
   NOTATION
===================================================== */

function squareName(r, f) {
  return FILES[f] + (r + 1);
}

function notation(mv, piece, check, mate) {
  if (mv.castle === "K") {
    return mate ? "O-O#" : check ? "O-O+" : "O-O";
  }

  if (mv.castle === "Q") {
    return mate ? "O-O-O#" : check ? "O-O-O+" : "O-O-O";
  }

  const letters = {
    p: "",
    n: "N",
    b: "B",
    r: "R",
    q: "Q",
    k: "K",
  };

  let text = letters[piece.type];

  if (piece.type === "p" && mv.capture) {
    text += FILES[mv.from[1]];
  }

  if (mv.capture) {
    text += "x";
  }

  text += squareName(mv.to[0], mv.to[1]);

  if (mv.promotion) {
    text += "=" + (mv.promoteTo || "q").toUpperCase();
  }

  if (mate) {
    text += "#";
  } else if (check) {
    text += "+";
  }

  return text;
}

/* =====================================================
   CHESS COMPONENT
===================================================== */

function Chess({ mode = "computer" }) {
  const createState = () => ({
    board: initialBoard(),

    turn: "w",

    castling: {
      wK: true,
      wQ: true,
      bK: true,
      bQ: true,
    },

    enPassant: null,

    history: [],

    captured: {
      w: [],
      b: [],
    },

    selected: null,

    targets: [],

    lastMove: null,

    gameOver: false,

    winner: null,
  });

  const [game, setGame] = useState(createState);

  const [promotion, setPromotion] = useState(null);

  /* USER COLOR */

  const [playerColor, setPlayerColor] = useState("w");

  const computerColor = playerColor === "w" ? "b" : "w";

  const currentInCheck = useMemo(
    () => isInCheck(game.board, game.turn),
    [game.board, game.turn],
  );

  /* =====================================================
     RESET
  ===================================================== */

  const resetGame = (newColor = playerColor) => {
    setGame(createState());

    setPromotion(null);

    setPlayerColor(newColor);
  };

  /* =====================================================
     CHANGE PLAYER COLOR
  ===================================================== */

  const changePlayerColor = (color) => {
    resetGame(color);
  };

  /* =====================================================
     MAKE MOVE
  ===================================================== */

  const makeMove = (mv, promotionType = null) => {
    setGame((old) => {
      const piece = old.board[mv.from[0]][mv.from[1]];

      const nextBoard = applyMove(old.board, mv);

      if (promotionType) {
        nextBoard[mv.to[0]][mv.to[1]] = {
          ...nextBoard[mv.to[0]][mv.to[1]],

          type: promotionType,
        };
      }

      const capturedPiece = old.board[mv.to[0]][mv.to[1]];

      const next = {
        ...old,

        board: nextBoard,

        selected: null,

        targets: [],

        lastMove: {
          from: mv.from,
          to: mv.to,
        },

        castling: {
          ...old.castling,
        },

        captured: {
          w: [...old.captured.w],

          b: [...old.captured.b],
        },
      };

      /* EN PASSANT */

      if (mv.enPassant) {
        const capR = piece.color === "w" ? mv.to[0] - 1 : mv.to[0] + 1;

        const captured = old.board[capR][mv.to[1]];

        if (captured) {
          next.captured[piece.color].push(captured.type);
        }
      } else if (capturedPiece) {
        next.captured[piece.color].push(capturedPiece.type);
      }

      /* KING CASTLING RIGHTS */

      if (piece.type === "k") {
        if (piece.color === "w") {
          next.castling.wK = false;

          next.castling.wQ = false;
        } else {
          next.castling.bK = false;

          next.castling.bQ = false;
        }
      }

      const clearRook = (r, f) => {
        if (r === 0 && f === 0) {
          next.castling.wQ = false;
        }

        if (r === 0 && f === 7) {
          next.castling.wK = false;
        }

        if (r === 7 && f === 0) {
          next.castling.bQ = false;
        }

        if (r === 7 && f === 7) {
          next.castling.bK = false;
        }
      };

      clearRook(mv.from[0], mv.from[1]);

      clearRook(mv.to[0], mv.to[1]);

      /* EN PASSANT TARGET */

      next.enPassant = mv.double
        ? [(mv.from[0] + mv.to[0]) / 2, mv.from[1]]
        : null;

      /* NEXT TURN */

      const nextTurn = piece.color === "w" ? "b" : "w";

      next.turn = nextTurn;

      /* GAME STATUS */

      const moves = allLegalMoves(nextBoard, nextTurn, next);

      const check = isInCheck(nextBoard, nextTurn);

      const mate = check && moves.length === 0;

      const stale = !check && moves.length === 0;

      const san = notation(
        {
          ...mv,

          promoteTo: promotionType,
        },

        {
          ...piece,

          type: promotionType || piece.type,
        },

        check,
        mate,
      );

      next.history = [
        ...old.history,

        {
          san,

          move: {
            ...mv,

            promoteTo: promotionType,
          },
        },
      ];

      if (mate || stale) {
        next.gameOver = true;

        next.winner = mate ? piece.color : "draw";
      }

      return next;
    });
  };

  /* =====================================================
     SELECT SQUARE
  ===================================================== */

  const selectSquare = (r, f) => {
    if (game.gameOver) {
      return;
    }

    /* COMPUTER TURN */

    if (mode === "computer" && game.turn !== playerColor) {
      return;
    }

    const piece = game.board[r][f];

    /* SELECTED */

    if (game.selected) {
      const move = game.targets.find((m) => m.to[0] === r && m.to[1] === f);

      if (move) {
        if (move.promotion) {
          setPromotion(move);
        } else {
          makeMove(move);
        }

        return;
      }
    }

    /* SELECT PIECE */

    if (piece && piece.color === game.turn) {
      const targets = legalMoves(game.board, r, f, game);

      setGame((old) => ({
        ...old,

        selected: [r, f],

        targets,
      }));
    } else {
      setGame((old) => ({
        ...old,

        selected: null,

        targets: [],
      }));
    }
  };

  /* =====================================================
     COMPUTER AI
  ===================================================== */

  useEffect(() => {
    if (mode !== "computer" || game.turn !== computerColor || game.gameOver) {
      return;
    }

    const timer = setTimeout(() => {
      const moves = allLegalMoves(game.board, computerColor, game);

      if (!moves.length) {
        return;
      }

      const captures = moves.filter((m) => m.capture);

      const pool = captures.length ? captures : moves;

      const move = pool[Math.floor(Math.random() * pool.length)];

      if (move.promotion) {
        makeMove(move, "q");
      } else {
        makeMove(move);
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [mode, playerColor, computerColor, game.turn, game.gameOver, game.board]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="chess-page">
      {/* HEADER */}

      <header className="chess-header">
        <div className="chess-logo">
          <div className="logo-mark">♞</div>

          <div>
            <div className="logo-name">
              DARK
              <span>KNIGHT</span>
            </div>

            <div className="logo-subtitle">CHESS ARENA</div>
          </div>
        </div>

        <div className="header-center">
          <div className="eyebrow">STRATEGY · PRECISION · VICTORY</div>

          <h1>
            Dark Knight
            <em> Chess</em>
          </h1>
        </div>

        <div className="header-right">
          <div className="game-mode">
            <span className="online-dot" />

            {mode === "computer" ? "VS COMPUTER" : "TWO PLAYERS"}
          </div>

          {mode === "computer" && (
            <div className="color-selector">
              <button
                type="button"
                className={
                  playerColor === "w" ? "color-btn active" : "color-btn"
                }
                onClick={() => changePlayerColor("w")}
              >
                ♔ WHITE
              </button>

              <button
                type="button"
                className={
                  playerColor === "b" ? "color-btn active" : "color-btn"
                }
                onClick={() => changePlayerColor("b")}
              >
                ♚ BLACK
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN */}

      <div className="chess-layout">
        {/* BOARD */}

        <div className="board-column">
          <div className="captured-tray">
            <span>BLACK CAPTURED</span>

            <div>
              {game.captured.b.map((type, i) => (
                <span key={i} className="captured-piece black-piece">
                  {GLYPH.w[type]}
                </span>
              ))}
            </div>
          </div>

          <div className="board-frame">
            <div className="board">
              {Array.from(
                {
                  length: 8,
                },
                (_, row) => {
                  const r = 7 - row;

                  return Array.from(
                    {
                      length: 8,
                    },
                    (_, f) => {
                      const piece = game.board[r][f];

                      const light = (r + f) % 2 === 1;

                      const selected =
                        game.selected &&
                        game.selected[0] === r &&
                        game.selected[1] === f;

                      const target = game.targets.find(
                        (m) => m.to[0] === r && m.to[1] === f,
                      );

                      const checkKing =
                        piece?.type === "k" &&
                        piece.color === game.turn &&
                        currentInCheck;

                      const isLast =
                        game.lastMove &&
                        ((game.lastMove.from[0] === r &&
                          game.lastMove.from[1] === f) ||
                          (game.lastMove.to[0] === r &&
                            game.lastMove.to[1] === f));

                      return (
                        <div
                          key={`${r}-${f}`}
                          className={`
                            sq
                            ${light ? "light" : "dark"}
                            ${selected ? "selected" : ""}
                            ${target ? "target" : ""}
                            ${checkKing ? "check" : ""}
                            ${isLast ? "last" : ""}
                          `}
                          onClick={() => selectSquare(r, f)}
                        >
                          {piece && (
                            <span
                              className={`
                                piece
                                ${
                                  piece.color === "w"
                                    ? "white-piece"
                                    : "black-piece"
                                }
                              `}
                            >
                              {GLYPH[piece.color][piece.type]}
                            </span>
                          )}

                          {target && (
                            <span
                              className={
                                target.capture ? "capture-ring" : "move-dot"
                              }
                            />
                          )}
                        </div>
                      );
                    },
                  );
                },
              )}
            </div>
          </div>

          <div className="captured-tray">
            <span>WHITE CAPTURED</span>

            <div>
              {game.captured.w.map((type, i) => (
                <span key={i} className="captured-piece white-piece">
                  {GLYPH.b[type]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}

        <aside className="side-panel">
          {/* STATUS */}

          <div className="card status-card">
            <div className="turn">
              <span className={`turn-dot ${game.turn}`} />

              <span>{game.turn === "w" ? "White" : "Black"} to move</span>
            </div>

            <div className={currentInCheck ? "status danger" : "status"}>
              {game.gameOver
                ? "Game Finished"
                : currentInCheck
                  ? `${game.turn === "w" ? "White" : "Black"} is in check`
                  : mode === "computer" && game.turn !== playerColor
                    ? "Computer is thinking..."
                    : "Your turn"}
            </div>
          </div>

          {/* HISTORY */}

          <div className="card">
            <h2>MOVE HISTORY</h2>

            <div className="moves">
              {game.history.length === 0 && (
                <div className="empty">No moves yet</div>
              )}

              {game.history.map((item, index) => (
                <div className="move" key={index}>
                  <span>
                    {index % 2 === 0 && `${Math.floor(index / 2) + 1}.`}
                  </span>

                  <strong>{item.san}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* BUTTONS */}

          <div className="buttons">
            <button type="button" onClick={() => resetGame()}>
              ↻ Restart
            </button>

            <button
              type="button"
              className="primary"
              onClick={() => resetGame()}
            >
              ♞ New Game
            </button>
          </div>

          {/* INSTRUCTIONS */}

          <div className="card instructions">
            <h2>HOW TO PLAY</h2>

            <div className="instruction">
              <b>01</b>

              <span>Select any piece to view legal moves.</span>
            </div>

            <div className="instruction">
              <b>02</b>

              <span>Click a highlighted square to move.</span>
            </div>

            <div className="instruction">
              <b>03</b>

              <span>Checkmate the enemy king to win.</span>
            </div>
          </div>
        </aside>
      </div>

      {/* PROMOTION */}

      {promotion && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">♛</div>

            <h3>PROMOTE PAWN</h3>

            <p>Choose your new piece</p>

            <div className="promotion-buttons">
              {["q", "r", "b", "n"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    makeMove(promotion, type);

                    setPromotion(null);
                  }}
                >
                  {GLYPH[game.turn][type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER */}

      {game.gameOver && (
        <div className="modal-overlay">
          <div className="modal end-modal">
            <div className="result-icon">
              {game.winner === "draw" ? "🤝" : "♛"}
            </div>

            <div className="result-label">GAME OVER</div>

            <h3>
              {game.winner === "draw"
                ? "DRAW"
                : `${game.winner === "w" ? "WHITE" : "BLACK"} WINS`}
            </h3>

            <p>
              {game.winner === "draw"
                ? "The game ended in stalemate."
                : "Checkmate. The king has no legal escape."}
            </p>

            <button
              type="button"
              className="primary large-button"
              onClick={() => resetGame()}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chess;
