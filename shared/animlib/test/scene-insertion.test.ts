import { expect, test } from 'vitest'
import { SceneSequence } from '../src/sequence'

test('inserted scenes have isolated handoffs and audio, while the original continuation follows its own controls', async () => {
  const sequence = new SceneSequence()
  try {
    const first = { id: 'first', handoffFrom: null, source: `export default scene({}, s => { const x = s.slider('x', { min: 0, max: 5, default: 1 }); s.keep(s.circle('dot', { position: [x, 0] })); s.wait(1); });` }
    const second = { id: 'second', handoffFrom: 'first', source: `export default scene({}, s => { s.wait(1); });` }
    expect((await sequence.submit({ type: 'load', scenes: [first, second] })).ok).toBe(true)
    const original = sequence.frame(1, 0)
    const toy = { id: 'toy', handoffFrom: null, audioId: 'toy:audio', source: `export default scene({ audio: 'audio' }, s => { s.circle('different'); s.wait(1); });` }
    expect((await sequence.submit({ type: 'insert', after: 'first', scenes: [toy] })).ok).toBe(true)
    expect(sequence.frame(2, 0)).toEqual(original)
    expect(sequence.compiled[1].options.audio).toBe('toy:audio')
    expect(sequence.frame(1, 0).elements.some(e => e.id === 'dot')).toBe(false)
    await sequence.setControl('first', 'x', 3)
    expect(sequence.frame(2, 0).elements.find(e => e.id === 'dot')?.position[0]).toBe(3)
    const bad = await sequence.submit({ type: 'insert', after: 'toy', scenes: [{ ...toy, id: 'bad', handoffFrom: 'second' }] })
    expect(bad.ok).toBe(false)
    expect(sequence.sources.map(s => s.id)).toEqual(['first', 'toy', 'second'])
  } finally { sequence.dispose() }
})
