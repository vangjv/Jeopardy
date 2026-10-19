// Original synthetic content only; no archive clues or downloaded media.
export function archiveHtml() {
  function clue(code, col, row, dd) {
    const id = `clue_${code}_${col}_${row}`;
    const value = row * (code === 'J' ? 200 : 400);
    const question = col === 1 && row === 1
      ? `An original &amp; tiny<br> clue&nbsp;about <a href="https://example.invalid/original.png">a square</a>.`
      : `Original ${code} column ${col}, row ${row}.`;
    return `<td class="clue"><table><tr><td><div><table class="clue_header"><tr>
      <td class="clue_unstuck" id="${id}_stuck"></td>
      <td class="${dd ? 'clue_value_daily_double' : 'clue_value'}">${dd ? 'DD: $7,200' : `$${value}`}</td>
      <td class="clue_order_number"><a href="#${id}">${31 - (row - 1) * 6 - col}</a></td>
      </tr></table></div></td></tr>
      <tr><td class="clue_text" id="${id}">${question}</td>
      <td class="clue_text" id="${id}_r" style="display:none">
      <table><tr><td>WRONG CONTESTANT RESPONSE</td></tr></table>
      <em class="correct_response">Original answer ${code} ${col} ${row}</em><p>DO NOT IMPORT COMMENTARY</p>
      </td></tr></table></td>`;
  }
  function round(code, section) {
    const names = Array.from({ length: 6 }, (_, index) => `<td class="category">
      <div class="category_name">${index === 5 ? '<a href="https://example.invalid/category.png">Original &amp; Shapes</a>' : `Original Category ${index + 1}`}</div>
      <div class="category_comments">${index === 5 ? 'Each response must name two shapes.' : ''}</div></td>`).join('');
    const rows = Array.from({ length: 5 }, (_, index) => `<tr>${Array.from({ length: 6 }, (_, col) =>
      clue(code, col + 1, index + 1, code === 'J' ? col === 1 && index === 3 : (col === 5 && index === 2) || (col === 0 && index === 3))).join('')}</tr>`).join('');
    return `<div id="${section}"><table class="round"><tr>${names}</tr>${rows}</table></div>`;
  }
  return `<!doctype html><html><head><title>Original test</title></head><body>
    <script>throw new Error('Page scripts must never run');</script>
    <div id="game_title"><h1>Original Practice #42 - 2026-10-18</h1></div>
    ${round('J', 'jeopardy_round')}${round('DJ', 'double_jeopardy_round')}
    <div id="final_jeopardy_round"><table class="final_round">
    <tr><td class="category"><div class="category_name">Original Finale</div></td></tr>
    <tr><td class="clue"><table><tr>
    <td class="clue_text" id="clue_FJ">An original final clue.</td>
    <td class="clue_text" id="clue_FJ_r" style="display:none">
    <table><tr><td>FINAL WRONG RESPONSE</td></tr></table>
    <em class="correct_response">An original final answer</em></td></tr></table>
    <var id="clue_FJ_stuck"></var></td></tr></table></div>
    </body></html>`;
}
