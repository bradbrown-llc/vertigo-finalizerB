import { kvv } from './lib/kvv.ts'
import { ejra } from './lib/ejra.ts'
import { Burn } from 'https://cdn.jsdelivr.net/gh/bradbrown-llc/vertigo@0.0.6/lib/Burn.ts'
import { processId } from './lib/processId.ts'
import { err } from './lib/err.ts'
import { out } from './lib/out.ts'

async function handleBurn(burn:Burn) {
    const active = await burn.destinationActive()
    const state = await burn.state()
    if (state === 'finalizable' && active === true) {
        const finalized = await burn.finalize()
        if (finalized === false) await burn.purge()
        if (finalized === true) await burn.move('finalized')
    }
    if (state === 'finalizable' && active === false) await burn.move('archive')
    await burn.unclaim(processId)
}

while (true) {

    const processing = await Burn.nextProcessing(processId, kvv, ejra, { err, out })
    if (processing instanceof Burn) { await handleBurn(processing); continue }

    const burn = await Burn.next('finalizable', kvv, ejra, { err, out })
    if (burn instanceof Error || burn === null) continue
    const claimed = await burn.claim(processId)
    if (claimed instanceof Error || claimed === false) continue
    await handleBurn(burn)
    
}