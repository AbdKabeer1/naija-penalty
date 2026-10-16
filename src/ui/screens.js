// All the interface: title screen, player picker, HUD, pause, result flashes.
//
// This is plain DOM sitting over the WebGL canvas rather than 3D text or
// sprites. That keeps type sharp on every screen density, makes the buttons
// real focusable elements for keyboard and screen-reader users, and means the
// styling lives in CSS where it belongs.

import { DIFFICULTY } from '../game/shootout.js';
import { makeFaceDataUrl, styleFace } from './faces.js';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(child);
  }
  return node;
}

// Portraits are drawn on a canvas, and a canvas can throw — a browser with no
// 2D context, a font that won't parse, a head shape with a bad radius. None of
// those should be able to empty the whole squad list, so a failed portrait
// degrades to no image and the card still renders.
function safeFace(player, size) {
  try {
    return makeFaceDataUrl(player, size);
  } catch (e) {
    console.warn('[faces] Could not draw a portrait:', e && e.message);
    return '';
  }
}

// Same safety for the fallback character portrait.
function safeStyleFace(style, size) {
  try {
    return styleFace(style, size);
  } catch (e) {
    console.warn('[faces] Could not draw the character portrait:', e && e.message);
    return '';
  }
}

// One labelled stat bar. Kept as a function because three of these would be
// three near-identical blocks otherwise.
function statRow(label, value) {
  const bar = el('div', { class: 'stat-track' }, [el('div', { class: 'stat-fill' })]);
  bar.firstChild.style.width = `${value}%`;
  return el('div', { class: 'stat' }, [
    el('span', { class: 'stat-label', text: label }),
    bar,
    el('strong', { class: 'stat-value', text: String(value) }),
  ]);
}

// The leaderboard table. start.ng supplies the entries and the ranking, so this
// only has to lay them out.
function boardTable(entries, local, highlightId) {
  const list = el('div', { class: 'board' });

  list.appendChild(
    el('div', { class: 'board-head' }, [
      el('span', { class: 'board-title', text: 'Global top scores' }),
      el('span', {
        class: `board-badge${local ? ' board-badge-off' : ''}`,
        text: local ? 'Not on start.ng' : 'Live',
        title: local
          ? 'Scores only work once the game is live on start.ng.'
          : 'Shared with everyone playing this game.',
      }),
    ])
  );

  if (!entries || entries.length === 0) {
    list.appendChild(
      el('p', { class: 'board-empty', text: 'No scores yet. Be the first.' })
    );
    return list;
  }

  entries.slice(0, 10).forEach((e) => {
    const stats = e.stats || {};
    list.appendChild(
      el('div', { class: `board-row${e.player_id === highlightId ? ' board-me' : ''}` }, [
        el('span', { class: 'board-rank', text: String(e.rank) }),
        el('span', { class: 'board-name', text: e.name }),
        el('span', { class: 'board-stat', text: `${stats.goals ?? 0} ⚽` }),
        el('span', { class: 'board-stat', text: `${stats.saves ?? 0} 🧤` }),
      ])
    );
  });

  return list;
}

export function createUI(root) {
  let selected = null;
  let squad = [];
  let difficulty = 'normal';

  // ---- HUD ---------------------------------------------------------------
  const hud = el('div', { class: 'hud hidden' });
  const hudRound = el('div', { class: 'hud-pill' });
  const hudScore = el('div', { class: 'hud-pill hud-score' });
  const hudDiff = el('div', { class: 'hud-pill hud-diff' });
  const pauseBtn = el('button', {
    class: 'hud-pill hud-btn',
    text: 'II',
    'aria-label': 'Pause',
    title: 'Pause (Esc)',
    onClick: () => hud._onPause && hud._onPause(),
  });

  const powerWrap = el('div', { class: 'power hidden' }, [
    el('div', { class: 'power-label', text: 'POWER' }),
    el('div', { class: 'power-track' }, [el('div', { class: 'power-fill' })]),
  ]);

  hud.append(hudRound, hudScore, hudDiff, pauseBtn, powerWrap);
  root.appendChild(hud);

  // ---- Result flash ------------------------------------------------------
  const flash = el('div', { class: 'flash hidden' });
  root.appendChild(flash);

  // ---- Pause overlay -----------------------------------------------------
  const pausePanel = el('div', { class: 'overlay hidden' });
  const pauseCard = el('div', { class: 'overlay-card' });
  pausePanel.appendChild(pauseCard);
  root.appendChild(pausePanel);

  // ---- Keeper picker -----------------------------------------------------
  const keepPanel = el('div', { class: 'keep-panel hidden' }, [
    el('h2', { text: 'You are in goal' }),
    el('p', { class: 'keep-sub', text: 'Pick where you think they will shoot.' }),
  ]);
  const keepGrid = el('div', { class: 'keep-grid' });
  keepPanel.appendChild(keepGrid);
  root.appendChild(keepPanel);

  // ---- Menu --------------------------------------------------------------
  // Starts hidden. It's added to the DOM after the gate, so without this it
  // would paint on top of the sign-in screen and block its buttons.
  const menu = el('div', { class: 'menu hidden' });

  menu.appendChild(
    el('header', { class: 'menu-head' }, [
      el('div', { class: 'kicker', text: 'Rural shootout' }),
      el('h1', { class: 'title', text: 'NAIJA PENALTY' }),
      el('p', {
        class: 'subtitle',
        text: 'Five penalties to take. Five to save. Pick a player from anywhere in the country.',
      }),
    ])
  );

  const diffRow = el('div', { class: 'diff-row' });
  for (const d of Object.values(DIFFICULTY)) {
    diffRow.appendChild(
      el('button', {
        class: `chip${difficulty === d.key ? ' chip-on' : ''}`,
        text: d.label,
        onClick: () => {
          difficulty = d.key;
          refreshDifficulty();
        },
      })
    );
  }
  menu.appendChild(diffRow);

  function refreshDifficulty() {
    for (const btn of diffRow.children) {
      const d = Object.values(DIFFICULTY).find((x) => x.label === btn.textContent);
      btn.classList.toggle('chip-on', d && d.key === difficulty);
    }
  }

  // The profile panel sits beside the grid on wide screens and above it on
  // phones, so you can always see what you've picked.
  const profile = el('aside', { class: 'profile' });
  const grid = el('div', { class: 'squad-grid' });
  const body = el('div', { class: 'menu-body' }, [profile, grid]);
  menu.appendChild(body);

  const footer = el('div', { class: 'menu-foot' });
  const startBtn = el('button', {
    class: 'btn btn-primary',
    text: 'Kick off',
    disabled: 'true',
    onClick: () => {
      // The handler is attached in showMenu, because the menu is rebuilt on
      // every "play again" and a stale closure would fire the old game.
      if (selected) menu._onStart(selected, difficulty);
    },
  });
  const selectedLine = el('div', { class: 'selected-line', text: 'No player selected' });
  footer.append(selectedLine, startBtn);
  menu.appendChild(footer);
  root.appendChild(menu);

  // ---- Summary -----------------------------------------------------------
  const summary = el('div', { class: 'overlay hidden' });
  root.appendChild(summary);

  // -----------------------------------------------------------------------

  // The left panel is YOU.
  //
  // Your character comes from start.ng and is the figure that actually takes
  // the penalties — that's the platform's character rule, and it's what makes
  // start.ng feel like one place rather than a pile of separate games. The grid
  // beside it is the opposition.
  function renderYou(player, onSignIn) {
    profile.innerHTML = '';
    if (!player) return;

    const isGuest = !player.account;

    // start.ng sends a real picture of the character. We only draw one
    // ourselves when the game is opened outside start.ng and there is none.
    const portraitSrc = player.face || safeStyleFace(player.style, 320);

    profile.append(
      el('div', { class: 'profile-top' }, [
        el('img', { class: 'profile-face', src: portraitSrc, alt: player.name }),
      ]),
      el('div', { class: 'profile-you-label', text: 'You' }),
      el('div', { class: 'profile-first', text: player.name }),
      el('div', {
        class: 'profile-last',
        text: isGuest ? 'Playing as a guest' : `@${player.account}`,
      }),
      isGuest
        ? el('button', {
            class: 'btn btn-ghost profile-signin',
            text: 'Sign in to save scores',
            onClick: () => onSignIn(),
          })
        : el('div', { class: 'profile-signed-in', text: 'Scores saved to start.ng' }),
      el('p', {
        class: 'profile-hint-sub',
        text: 'Pick who you are up against on the right.',
      })
    );
  }

  function renderOpponent(player) {
    const slot = profile.querySelector('.opponent-slot');
    if (slot) slot.remove();
    if (!player) return;

    profile.append(
      el('div', { class: 'opponent-slot' }, [
        el('div', { class: 'opponent-label', text: 'Up against' }),
        el('img', { class: 'opponent-face', src: safeFace(player, 120), alt: '' }),
        el('div', { class: 'opponent-name', text: player.name }),
        el('div', { class: 'opponent-club', text: player.club }),
      ])
    );
  }

  function select(player) {
    // `selected` is now the OPPOSITION, not the player you control — you're
    // always your start.ng character.
    selected = player;
    selectedLine.textContent = `Up against ${player.name} · ${player.club}`;
    startBtn.disabled = false;
    renderOpponent(player);
    for (const card of grid.children) {
      card.classList.toggle('card-on', card.dataset.id === player.id);
    }
  }

  function buildGrid() {
    grid.innerHTML = '';

    for (const p of squad) {
      const card = el('button', {
        class: `player-card${selected && selected.id === p.id ? ' card-on' : ''}`,
        'data-id': p.id,
        onClick: () => select(p),
      });

      const face = el('img', {
        class: 'card-face',
        src: safeFace(p, 160),
        alt: '',
        loading: 'lazy',
      });

      const swatch = el('div', { class: 'swatch' });
      swatch.style.background = p.skinHex;

      const num = el('div', { class: 'num', text: String(p.number) });
      num.style.color = p.kitColors.trim;

      const faceWrap = el('div', { class: 'face' }, [face, swatch, num]);
      faceWrap.style.background = p.kitColors.shirt;

      card.append(
        faceWrap,
        el('div', { class: 'card-name', text: p.firstName }),
        el('div', { class: 'card-meta', text: `${p.age} · ${p.state}` }),
        el('div', { class: 'card-state', text: p.club })
      );
      grid.appendChild(card);
    }
  }

  return {
    // ---- Menu ----------------------------------------------------------
    //
    // `player` is who YOU are, from start.ng: their character, name and face.
    // The roster grid is the opposition you choose to play against.
    showMenu({ roster, player, onStart, onSignIn }) {
      squad = roster;
      menu._onStart = onStart;
      menu._onSignIn = onSignIn;
      // Kept so "play again" can rebuild this screen without the caller having
      // to thread the player back through.
      menu._player = player;
      buildGrid();
      renderYou(player, onSignIn);
      renderOpponent(selected);
      menu.classList.remove('hidden');
      hud.classList.add('hidden');
      summary.classList.add('hidden');
      pausePanel.classList.add('hidden');
    },

    hideMenu() {
      menu.classList.add('hidden');
      hud.classList.remove('hidden');
    },

    onPause(handler) {
      hud._onPause = handler;
    },

    // ---- HUD -----------------------------------------------------------
    setHud({ round, side, goals, shots, saves, faced }) {
      hudDiff.textContent = (DIFFICULTY[difficulty] || DIFFICULTY.normal).label;
      if (side === 'keep') {
        hudRound.textContent = `Save ${round} of 5`;
        hudScore.textContent = `Saves ${saves}/${faced}`;
      } else {
        hudRound.textContent = `Penalty ${round} of 5`;
        hudScore.textContent = `Scored ${goals}/${shots}`;
      }
    },

    showPower(show, value = 0) {
      powerWrap.classList.toggle('hidden', !show);
      if (show) this.setPower(value);
    },

    setPower(value) {
      const fill = powerWrap.querySelector('.power-fill');
      fill.style.width = `${Math.round(value * 100)}%`;
      fill.style.background =
        value > 0.86
          ? 'linear-gradient(90deg,#ff8a5c,#e2571e)'
          : 'linear-gradient(90deg,#7fd18a,#008751)';
    },

    // ---- Pause ---------------------------------------------------------
    showPause() {
      pauseCard.innerHTML = '';
      pauseCard.append(
        el('h2', { class: 'overlay-title', text: 'Paused' }),
        el('p', { class: 'overlay-sub', text: 'Take your time.' }),
        el('button', {
          class: 'btn btn-primary',
          text: 'Resume',
          onClick: () => pausePanel._onResume(),
        }),
        el('button', {
          class: 'btn btn-ghost',
          text: 'Restart match',
          onClick: () => {
            pausePanel.classList.add('hidden');
            pausePanel._onRestart();
          },
        }),
        el('button', {
          class: 'btn btn-ghost',
          text: 'Back to player select',
          onClick: () => {
            pausePanel.classList.add('hidden');
            pausePanel._onQuit();
          },
        })
      );
      pausePanel.classList.remove('hidden');
    },

    hidePause() {
      pausePanel.classList.add('hidden');
    },

    get paused() {
      return !pausePanel.classList.contains('hidden');
    },

    setPauseHandlers({ onResume, onRestart, onQuit }) {
      pausePanel._onResume = onResume;
      pausePanel._onRestart = onRestart;
      pausePanel._onQuit = onQuit;
    },

    // ---- Result --------------------------------------------------------
    flashResult(outcome) {
      const good = outcome.kind === 'goal' || outcome.kind === 'save';
      const neutral = outcome.kind === 'theirmiss' || outcome.kind === 'woodwork';
      flash.textContent = outcome.label;
      flash.className = `flash ${good ? 'flash-good' : neutral ? 'flash-neutral' : 'flash-bad'}`;
      void flash.offsetWidth; // restart the animation even for a repeat label
      flash.classList.add('flash-on');
      setTimeout(() => flash.classList.remove('flash-on'), 1500);
    },

    clearFlash() {
      flash.classList.remove('flash-on');
      flash.className = 'flash hidden';
    },

    // ---- Keeper picker -------------------------------------------------
    showKeeperPick(zones, onPick) {
      keepGrid.innerHTML = '';
      for (const z of zones) {
        keepGrid.appendChild(
          el('button', {
            class: 'keep-slot',
            text: z.label,
            onClick: () => {
              keepPanel.classList.add('hidden');
              onPick(z.id);
            },
          })
        );
      }
      keepPanel.classList.remove('hidden');
    },

    hideKeeperPick() {
      keepPanel.classList.add('hidden');
    },

    // ---- Summary -------------------------------------------------------
    showSummary({
      goals,
      shots,
      saves,
      faced,
      playerName,
      playerId,
      opponent,
      board,
      local,
      signedIn,
      saved,
      onSignIn,
    }) {
      summary.innerHTML = '';
      const won = goals > faced - saves;

      const statLines = [
        el('div', { class: 'summary-row' }, [
          el('span', { text: 'Penalties scored' }),
          el('strong', { text: `${goals} / ${shots}` }),
        ]),
        el('div', { class: 'summary-row' }, [
          el('span', { text: 'Penalties saved' }),
          el('strong', { text: `${saves} / ${faced}` }),
        ]),
        el('div', { class: 'summary-row' }, [
          el('span', { text: 'Difficulty' }),
          el('strong', { text: (DIFFICULTY[difficulty] || DIFFICULTY.normal).label }),
        ]),
      ];

      // The one line that tells you whether your run actually counted.
      let saveLine = null;
      if (!signedIn) {
        saveLine = el('button', {
          class: 'btn btn-ghost',
          text: 'Sign in to save your score',
          onClick: () => onSignIn && onSignIn(),
        });
      } else if (saved && saved.ok === false) {
        saveLine = el('p', { class: 'summary-note', text: saved.error || 'Score not saved.' });
      } else if (saved && saved.improved) {
        saveLine = el('p', { class: 'summary-note summary-note-good', text: `New best! You're #${saved.rank}` });
      } else if (saved) {
        saveLine = el('p', {
          class: 'summary-note',
          text: `Not your best this time — you're #${saved.rank}`,
        });
      }

      summary.append(
        el('div', { class: 'overlay-card' }, [
          el('div', { class: 'kicker', text: won ? 'You win' : 'Full time' }),
          el('h1', { class: 'title', text: won ? 'NAIJA CHAMPION' : 'SO CLOSE' }),
          oppositeLine(playerName, opponent),
          el('div', { class: 'summary-rows' }, statLines),
          saveLine,
          board ? boardTable(board, local, playerId) : null,
          el('button', {
            class: 'btn btn-primary',
            text: 'Play again',
            onClick: () => {
              summary.classList.add('hidden');
              this.showMenu({
                roster: squad,
                player: menu._player,
                onStart: menu._onStart,
                onSignIn: menu._onSignIn,
              });
            },
          }),
        ])
      );
      summary.classList.remove('hidden');
      hud.classList.add('hidden');
    },
  };
}

// "You vs Them", on the full-time card. Small, but it's the line that makes the
// result feel like it was against somebody rather than against the computer.
function oppositeLine(playerName, opponent) {
  if (!opponent) return null;
  return el('div', { class: 'summary-striker' }, [
    el('img', { class: 'summary-face', src: safeFace(opponent, 160), alt: '' }),
    el('div', {}, [
      el('div', { class: 'summary-name', text: `${playerName} vs ${opponent.name}` }),
      el('div', { class: 'summary-club', text: opponent.club }),
    ]),
  ]);
}
