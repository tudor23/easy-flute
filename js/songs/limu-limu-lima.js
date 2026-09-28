// Transcribed from the printed staff (docs/sample_song_sheet.jpg), cross-checked with
// docs/sample_song_notes.json and a clean score found online (docs/limu-limu-lima-score.png).
// Key signature: one sharp, so every FA is FA#. Durations in quarter-note beats (eighth = 0.5).
export default {
  id: 'limu-limu-lima',
  title: 'Limu, Limu, Lima',
  subtitle: { es: 'Canción tradicional sueca', en: 'Swedish traditional song', ca: 'Cançó tradicional sueca' },
  timeSignature: [2, 4],
  video: 'https://www.youtube.com/watch?v=3w3x3lRLuIY&t=8s',
  measures: [
    [['MI', 0.5], ['SI', 0.5], ['SI', 0.5], ['LA', 0.5]],
    [['SI', 1], ['FA#', 1]],
    [['SOL', 0.5], ['MI', 0.5], ['SOL', 0.5], ['SOL', 0.5]],
    [['FA#', 1], ['MI', 1]],
    [['SOL', 0.5], ['LA', 0.5], ['SI', 1]],
    [['SOL', 0.5], ['FA#', 0.5], ['MI', 1]],
    [['SOL', 0.5], ['LA', 0.5], ['SI', 1]],
    [['SOL', 0.5], ['FA#', 0.5], ['MI', 1]],
    [['SOL', 0.5], ['LA', 0.5], ['SI', 1]],
    [['SOL', 0.5], ['FA#', 0.5], ['MI', 0.5], ['SOL', 0.5]],
    [['RE#', 1], ['FA#', 1]],
    [['MI', 1], ['rest', 1]],
  ],
};
