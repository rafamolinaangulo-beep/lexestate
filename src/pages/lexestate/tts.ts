export function speak(text: string, rate = 0.85) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-GB'
  utt.rate = rate
  window.speechSynthesis.speak(utt)
}
