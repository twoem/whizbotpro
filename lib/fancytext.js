// lib/fancytext.js
module.exports = function fancytext(input = '') {
  const upsidedown = input.split('').reverse().map(c => {
    const map = { a:'ɐ', b:'q', c:'ɔ', d:'p', e:'ǝ', f:'ɟ', g:'ɓ', h:'ɥ',
                  i:'ᴉ', j:'ɾ', k:'ʞ', l:'ʅ', m:'ɯ', n:'u', o:'o', p:'d',
                  q:'b', r:'ɹ', s:'s', t:'ʇ', u:'n', v:'ʌ', w:'ʍ', x:'x',
                  y:'ʎ', z:'z' };
    return map[c.toLowerCase()] || c;
  }).join('');
  const spaced = input.split('').join(' ');
  return [
    `• Normal: ${input}`,
    `• Upside: ${upsidedown}`,
    `• Spaced: ${spaced}`
  ];
};
